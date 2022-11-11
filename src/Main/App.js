import logo from '../logo.svg';
import './App.css';
import React, { useEffect } from 'react';
// Import required AWS SDK clients and commands for Node.js


import { GetItemCommand } from '@aws-sdk/client-dynamodb';

import AWS from 'aws-sdk'

// Set the parameters
var params = {
  AttributeDefinitions: [
    {
      AttributeName: "Artist",
      AttributeType: "S"
    },
    {
      AttributeName: "SongTitle",
      AttributeType: "S"
    }
  ],
  KeySchema: [
    {
      AttributeName: "Artist",
      KeyType: "HASH"
    },
    {
      AttributeName: "SongTitle",
      KeyType: "RANGE"
    }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5
  },
  TableName: "Music"
};


function App() {

  AWS.config.update({ "accessKeyId": process.env.REACT_APP_ACCESS_ID, "secretAccessKey": process.env.REACT_APP_SECRET_ID, "region": "us-east-1" })
  const docClient = new AWS.DynamoDB();

  const fetchData = () => {
    // const run = async () => {
    //   const data = await ddbClient.send(new GetItemCommand(params));
    //   console.log("Success", data.Item);
    //   return data;
    // };

    // const fetch = run()
    // fetch
    //   .then((res) => console.log(res))
    //   .catch((err) => console.log(err))
    docClient.createTable(params, function (err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else console.log(data);           // successful response
    })

  }
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>

          <button onClick={() => fetchData()}>Click me</button>
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
