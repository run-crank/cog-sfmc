import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Metadata } from 'grpc';

chai.use(sinonChai);

describe('ClientWrapper', () => {
  const expect = chai.expect;
  let sfmcClientStub: any;
  let sfmcSdkStub: any;
  let metadata: Metadata;
  let ClientWrapper: any;

  beforeEach(async () => {
    sfmcClientStub = {
      rest: {
        post: sinon.stub()
      }
    }
    sfmcSdkStub = sinon.stub();
    sfmcSdkStub.returns(sfmcClientStub);

    metadata = new Metadata(); 

    // Dynamically import ClientWrapper to avoid ES module issues
    const module = await import('../../src/client/client-wrapper');
    ClientWrapper = module.ClientWrapper;
  });

  it('authenticates', async () => {
    const expectedCallArgs = {
      client_id: 'exampleClientId',
      client_secret: 'exampleClientSecret',
      auth_url: 'exampleAuthUrl',
      account_id: 'exampleAccountId',
    };

    metadata = new Metadata();
    metadata.add('clientId', expectedCallArgs.client_id);
    metadata.add('clientSecret', expectedCallArgs.client_secret);
    metadata.add('authUrl', expectedCallArgs.auth_url);
    metadata.add('accountId', expectedCallArgs.account_id);

    // Initialize ClientWrapper
    const clientWrapperUnderTest = new ClientWrapper(metadata, sfmcSdkStub);
    expect(sfmcSdkStub).to.have.been.calledWith(expectedCallArgs);
  });

  it('getClientByEmail', async () => {
    const expectedEmail = 'test@example.com';
  
    // Initialize ClientWrapper
    const clientWrapperUnderTest = new ClientWrapper(metadata, sfmcSdkStub);
  
    await clientWrapperUnderTest.getContactByEmail(expectedEmail);
    expect(sfmcClientStub.rest.post).to.have.been.called;
  });
  

});
