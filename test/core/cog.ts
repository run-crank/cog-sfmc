import * as fs from 'fs';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RunStepRequest } from '../../src/proto/cog_pb';
import { Cog } from '../../src/core/cog';
import { CogManifest, ManifestRequest } from '../../src/proto/cog_pb';
import { Metadata } from '@grpc/grpc-js';
import { Duplex } from 'stream';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { ClientWrapper } from '../../src/client/client-wrapper';
import { ServerUnaryCall, sendUnaryData } from '@grpc/grpc-js';
import { EventEmitter } from 'events';

chai.use(sinonChai);

describe('Cog:GetManifest', () => {
  const expect = chai.expect;
  let cog: Cog;
  let clientWrapperStub: any;
  let metadata: Metadata;

  beforeEach(() => {
    clientWrapperStub = sinon.createStubInstance(ClientWrapper);
    metadata = new Metadata();
    cog = new Cog(clientWrapperStub);
  });

  it('should return expected cog metadata', (done) => {
    const version: string = JSON.parse(fs.readFileSync('package.json').toString('utf8')).version;
    const mockCall = Object.assign(new EventEmitter(), {
      request: new ManifestRequest(),
      metadata: new Metadata(),
      getPeer: () => 'test',
      getDeadline: () => new Date(),
      getPath: () => 'test',
      getHost: () => 'test',
      cancelled: false,
      sendMetadata: () => {}
    }) as ServerUnaryCall<ManifestRequest, CogManifest>;

    const callback: sendUnaryData<CogManifest> = (err, manifest) => {
      expect(err).to.be.null;
      expect(manifest).to.be.instanceOf(CogManifest);
      
      if (manifest) {
        expect(manifest.getName()).to.equal('stackmoxie/sfmc');
        expect(manifest.getVersion()).to.equal(version);
      }
      done();
    };

    cog.getManifest(mockCall, callback);
  });

  it('should return expected cog auth fields', (done) => {
    const expectedAuthFields = [
      {
        field: 'restEndpoint',
        type: FieldDefinition.Type.STRING,
        description: 'REST API Instance URL, e.g. https://ZZZZZZZ.rest.marketingcloudapis.com/'
      },
      {
        field: 'clientId',
        type: FieldDefinition.Type.STRING,
        description: 'OAuth2 Client ID'
      },
      {
        field: 'clientSecret',
        type: FieldDefinition.Type.STRING,
        description: 'OAuth2 Client Secret'
      }
    ];

    const mockCall = Object.assign(new EventEmitter(), {
      request: new ManifestRequest(),
      metadata: new Metadata(),
      getPeer: () => 'test',
      getDeadline: () => new Date(),
      getPath: () => 'test',
      getHost: () => 'test',
      cancelled: false,
      sendMetadata: () => {}
    }) as ServerUnaryCall<ManifestRequest, CogManifest>;

    const callback: sendUnaryData<CogManifest> = (err, response) => {
      expect(err).to.be.null;
      expect(response).to.be.instanceOf(CogManifest);
      
      if (response) {
        const authFields = response.getAuthFieldsList().map(field => ({
          field: field.getKey(),
          type: field.getType(),
          description: field.getDescription()
        }));

        expect(authFields).to.deep.equal(expectedAuthFields);
      }
      done();
    };

    cog.getManifest(mockCall, callback);
  });

  it('should return expected step definitions', (done) => {
    const mockCall = Object.assign(new EventEmitter(), {
      request: new ManifestRequest(),
      metadata: new Metadata(),
      getPeer: () => 'test',
      getDeadline: () => new Date(),
      getPath: () => 'test',
      getHost: () => 'test',
      cancelled: false,
      sendMetadata: () => {}
    }) as ServerUnaryCall<ManifestRequest, CogManifest>;

    const callback: sendUnaryData<CogManifest> = (err, manifest) => {
      expect(err).to.be.null;
      expect(manifest).to.be.instanceOf(CogManifest);
      
      if (manifest) {
        const stepDefs = manifest.getStepDefinitionsList();
        expect(stepDefs.length).to.be.greaterThan(0);
      }
      done();
    };

    cog.getManifest(mockCall, callback);
  });

});

describe('Cog:RunStep', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let grpcUnaryCall: any = {};
  let step: any = {};
  let cogUnderTest: Cog;
  let clientWrapperStub: any;
  const redisClient: any = '';
  const requestId: string = '1';
  const scenarioId: string = '2';
  const requestorId: string = '3';

  beforeEach(() => {
    protoStep = new ProtoStep();
    protoStep.setData(Struct.fromJavaScript({
      connection: 'anyId',
    }));
    grpcUnaryCall.request = {
      getStep: function () {return protoStep},
      getRequestId () { return requestId; },
      getScenarioId () { return scenarioId; },
      getRequestorId () { return requestorId; },
      metadata: null
    };
    clientWrapperStub = sinon.stub();
    cogUnderTest = new Cog(clientWrapperStub, {}, redisClient);
  });

  it('bypasses caching with bad redisUrl', (done) => {
    // Construct grpc metadata and assert the client was authenticated.
    grpcUnaryCall.metadata = new Metadata();
    // The following are not real credentials:
    grpcUnaryCall.metadata.add('clientId', '12345678-abcd-1234-abcd-1234567890ab');
    grpcUnaryCall.metadata.add('clientSecret', 's6dL@%hf27U6bAL*M#5x123dCbR9kL4Xm');
    grpcUnaryCall.metadata.add('authUrl', 'https://mc563885gzs27c5t9-63k636ttgm.auth.marketingcloudapis.com/');
    grpcUnaryCall.metadata.add('accountId', '123');

    cogUnderTest.runStep(grpcUnaryCall, (err, response: RunStepResponse) => {
      expect(clientWrapperStub).to.have.not.been.called;
      done();
    }).catch(done);
  });

  it('responds with error when called with unknown stepId', (done) => {
    protoStep.setStepId('NotRealStep');

    cogUnderTest.runStep(grpcUnaryCall, (err, response: RunStepResponse) => {
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      expect(response.getMessageFormat()).to.equal('Unknown step %s');
      done();
    });
  });

  it('invokes step class as expected', (done) => {
    const expectedResponse = new RunStepResponse();
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.resolves(expectedResponse);
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);

    cogUnderTest = new Cog(clientWrapperStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');

    cogUnderTest.runStep(grpcUnaryCall, (err, response: RunStepResponse) => {
      expect(mockTestStepMap.TestStepId).to.have.been.calledOnce;
      expect(mockStepExecutor.executeStep).to.have.been.calledWith(protoStep);
      expect(response).to.deep.equal(expectedResponse);
      done();
    });
  });

  it('responds with error when step class throws an exception', (done) => {
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.throws()
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);

    cogUnderTest = new Cog(clientWrapperStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');

    cogUnderTest.runStep(grpcUnaryCall, (err, response: RunStepResponse) => {
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      done();
    });
  });

});

describe('Cog:RunSteps', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let runStepRequest: RunStepRequest;
  let grpcDuplexStream: any;
  let cogUnderTest: Cog;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    runStepRequest = new RunStepRequest();
    grpcDuplexStream = new Duplex({objectMode: true});
    grpcDuplexStream._write = sinon.stub().callsArg(2);
    grpcDuplexStream._read = sinon.stub();
    grpcDuplexStream.metadata = new Metadata();
    // The following are not real credentials:
    grpcDuplexStream.metadata.add('clientId', '12345678-abcd-1234-abcd-1234567890ab');
    grpcDuplexStream.metadata.add('clientSecret', 's6dL@%hf27U6bAL*M#5x123dCbR9kL4Xm');
    grpcDuplexStream.metadata.add('authUrl', 'https://mc563885gzs27c5t9-63k636ttgm.auth.marketingcloudapis.com/');
    grpcDuplexStream.metadata.add('accountId', '123');
    clientWrapperStub = sinon.stub();
    cogUnderTest = new Cog(clientWrapperStub);
  });

  it('bypasses caching with bad redisUrl', () => {
    runStepRequest.setStep(protoStep);

    // Construct grpc metadata and assert the client was authenticated.
    grpcDuplexStream.metadata.add('anythingReally', 'some-value');

    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);
    expect(clientWrapperStub).to.have.not.been.called;
});

  it('responds with error when called with unknown stepId', (done) => {
    // Construct step request
    protoStep.setStepId('NotRealStep');
    runStepRequest.setStep(protoStep);

    // Open the stream and write a request.
    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);

    // Allow the event loop to continue, then make assertions.
    setTimeout(() => {
      const result: RunStepResponse = grpcDuplexStream._write.lastCall.args[0];
      expect(result.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      expect(result.getMessageFormat()).to.equal('Unknown step %s');
      done();
    }, 1)
  });

  it('invokes step class as expected', (done) => {
    // Construct a mock step executor and request request
    const expectedResponse = new RunStepResponse();
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.resolves(expectedResponse);
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);
    cogUnderTest = new Cog(clientWrapperStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');
    runStepRequest.setStep(protoStep);

    // Open the stream and write a request.
    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);

    // Allow the event loop to continue, then make assertions.
    setTimeout(() => {
      expect(mockTestStepMap.TestStepId).to.have.been.calledOnce;
      expect(mockStepExecutor.executeStep).to.have.been.calledWith(protoStep);
      expect(grpcDuplexStream._write.lastCall.args[0]).to.deep.equal(expectedResponse);
      done();
    }, 1);
  });

  it('responds with error when step class throws an exception', (done) => {
    // Construct a mock step executor and request request
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.throws()
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);
    cogUnderTest = new Cog(clientWrapperStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');
    runStepRequest.setStep(protoStep);

    // Open the stream and write a request.
    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);

    // Allow the event loop to continue, then make assertions.
    setTimeout(() => {
      const response: RunStepResponse = grpcDuplexStream._write.lastCall.args[0];
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      done();
    });
  });

});
