import * as grpc from '@grpc/grpc-js';
import { Field } from '../core/base-step';
import { FieldDefinition } from '../proto/cog_pb';
import { ContactAwareMixin } from './mixins';

const SDK = require('sfmc-sdk');

class ClientWrapper {

  /**
   * Oauth2 using sfmc-sdk
   */
  public static expectedAuthFields: Field[] = [{
    field: 'authUrl',
    type: FieldDefinition.Type.URL,
    description: 'Login/instance URL (e.g. https://ZZZZZZZ.auth.marketingcloudapis.com/)',
  }, {
    field: 'clientId',
    type: FieldDefinition.Type.STRING,
    description: 'OAuth2 Client ID',
  }, {
    field: 'clientSecret',
    type: FieldDefinition.Type.STRING,
    description: 'OAuth2 Client Secret',
  }, {
    field: 'accountId',
    type: FieldDefinition.Type.STRING,
    description: 'Account ID',
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
  constructor (auth: grpc.Metadata, clientConstructor = SDK) {
    this.client = new clientConstructor(
      {
        client_id: auth.get('clientId').toString(),
        client_secret: auth.get('clientSecret').toString(),
        auth_url: auth.get('authUrl').toString(),
        account_id: auth.get('accountId').toString(),
      },
      {
        eventHandlers: {
          onLoop: (type, accumulator) => console.log('Looping', type, accumulator.length),
          onRefresh: options => console.log('RefreshingToken.', options),
          logRequest: req => console.log(req),
          logResponse: res => console.log(res),
          onConnectionError: (ex, remainingAttempts) => console.log(ex.code, remainingAttempts),
        },
        requestAttempts : 1,
        retryOnConnectionError: true,
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
