import * as grpc from '@grpc/grpc-js';
import { Field } from '../core/base-step';
import { FieldDefinition } from '../proto/cog_pb';
import { ContactAwareMixin } from './mixins';

const fuelRest = require('fuel-rest');

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

  /**
   * Constructs an instance of the ClientWwrapper, authenticating the wrapped
   * client in the process.
   *
   * @param auth - An instance of GRPC Metadata for a given RunStep or RunSteps
   *   call. Will be populated with authentication metadata according to the
   *   expectedAuthFields array defined above.
   */
  constructor (auth: grpc.Metadata, clientConstructor = fuelRest) {
    this.client = new clientConstructor(
      {
        auth:{
          clientId: auth.get('clientId').toString(),
          clientSecret: auth.get('clientSecret').toString(),
          authUrl: `${auth.get('restEndpoint').toString().replace('.rest.', '.auth.')}/v2/token`,
          authOptions: {
            authVersion: 2,
          },
        },
        origin: auth.get('restEndpoint').toString(),
      },
    );
  }
}

interface ClientWrapper extends ContactAwareMixin {}
applyMixins(ClientWrapper, [ContactAwareMixin]);

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
          // tslint:disable-next-line:max-line-length
      Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
    });
  });
}

export { ClientWrapper as ClientWrapper };
