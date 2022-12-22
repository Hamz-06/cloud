import AWS, { CognitoIdentityServiceProvider } from 'aws-sdk';

AWS.config.update({ region: 'us-east-1' })
AWS.config.update({ "accessKeyId": "AKIAZPXWTNGS6AJLZRKO", "secretAccessKey": "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", "region": "us-east-1" })
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider()
const docClient = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES({ region: "us-east-1" })
export { AWS, cognitoidentityserviceprovider, docClient, ses }