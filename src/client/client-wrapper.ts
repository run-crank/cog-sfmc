import * as grpc from '@grpc/grpc-js';
import { Field } from '../core/base-step';
import { FieldDefinition } from '../proto/cog_pb';
import { ContactAwareMixin } from './mixins/contact-aware';
import { JourneyAwareMixin } from './mixins/journey-aware';
import { ListAwareMixin } from './mixins/list-aware';

const fuelRest = require('fuel-rest');
const fuelSoap = require('fuel-soap');

class ClientWrapper {

  /**
   * Oauth2 using sfmc-sdk
   */
  public static expectedAuthFields: Field[] = [{
    field: 'restEndpoint',
    type: FieldDefinition.Type.STRING,
    description: 'REST API Instance URL, e.g. https://ZZZZZZZ.rest.marketingcloudapis.com/',
  }, {
    field: 'clientId',
    type: FieldDefinition.Type.STRING,
    description: 'OAuth2 Client ID',
  }, {
    field: 'clientSecret',
    type: FieldDefinition.Type.STRING,
    description: 'OAuth2 Client Secret',
  }];

  public client: any;
  public soapClient: any;

  /**
   * Constructs an instance of the ClientWwrapper, authenticating the wrapped
   * client in the process.
   *
   * @param auth - An instance of GRPC Metadata for a given RunStep or RunSteps
   *   call. Will be populated with authentication metadata according to the
   *   expectedAuthFields array defined above.
   */
  constructor (auth: grpc.Metadata, clientConstructor = fuelRest, soapConstructor = fuelSoap) {
    const restEndpoint = auth.get('restEndpoint').toString();
    // Remove trailing slash if present
    const cleanEndpoint = restEndpoint.endsWith('/') ? restEndpoint.slice(0, -1) : restEndpoint;
    // Convert rest endpoint to auth endpoint
    const authEndpoint = cleanEndpoint.replace('.rest.', '.auth.');
    // Convert rest endpoint to SOAP endpoint
    const soapEndpoint = cleanEndpoint.replace('.rest.', '.soap.');

    console.log('Rest Endpoint:', cleanEndpoint);
    console.log('Auth Endpoint:', authEndpoint);
    console.log('SOAP Endpoint:', soapEndpoint);

    // Initialize REST client
    this.client = new clientConstructor(
      {
        auth:{
          clientId: auth.get('clientId').toString(),
          clientSecret: auth.get('clientSecret').toString(),
          authUrl: `${authEndpoint}/v2/token`,
          authOptions: {
            authVersion: 2,
          },
        },
        origin: cleanEndpoint,
      },
    );

    // Initialize SOAP client with the same auth credentials
    this.soapClient = new soapConstructor({
      soapEndpoint,
      auth: {
        clientId: auth.get('clientId').toString(),
        clientSecret: auth.get('clientSecret').toString(),
        authUrl: `${authEndpoint}/v2/token`,
        authOptions: {
          authVersion: 2,
        },
      },
    });

    // Log SOAP client methods for debugging
    console.log('SOAP client methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.soapClient)));

    // Make soapClient accessible through client for mixins
    this.client.soapClient = this.soapClient;
  }

  // Utility method to make a SOAP request
  async makeSoapRequest(action: string, props: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      this.soapClient.invoke(action, props, (err: any, response: any) => {
        if (err) {
          console.error(`SOAP Error (${action}):`, err);
          return reject(err);
        }

        console.log(`SOAP Response (${action}):`, JSON.stringify(response.body, null, 2));

        if (response.body && response.body.Results) {
          return resolve(response.body.Results);
        } else if (response.body) {
          return resolve(response.body);
        } else {
          return resolve(response);
        }
      });
    });
  }
}

interface ClientWrapper extends ContactAwareMixin, JourneyAwareMixin, ListAwareMixin {}
applyMixins(ClientWrapper, [ContactAwareMixin, JourneyAwareMixin, ListAwareMixin]);

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      // tslint:disable-next-line:max-line-length
      Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
    });
  });
}
export { ClientWrapper as ClientWrapper };
