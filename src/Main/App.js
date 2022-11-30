import logo from '../logo.svg';
import './App.css';
import React, { useEffect } from 'react';
// Import required AWS SDK clients and commands for Node.js
import { Routes, Route, useParams, BrowserRouter } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { CognitoIdentityProviderClient, AddCustomAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import AWS, { CognitoIdentityServiceProvider } from 'aws-sdk';
import { useState } from 'react';






function App() {
  // const idToken = fullUrl.split('=')[1].split('&')[0]
  const [userName, setUserName] = useState('')
  const [isAuthentic, setAuthentic] = useState(false)
  const [trades, updateTrades] = useState('')

  useEffect(() => {

    AWS.config.update({ region: 'us-east-1' })
    const cognitoidentityserviceprovider = new CognitoIdentityServiceProvider()
    // AWS.config.region = 'us-east-1';
    const fullUrl = document.location.href
    const idToken = fullUrl.indexOf('id_token') !== -1 ? fullUrl.split('=')[1].split('&')[0] : ''
    const accToken = fullUrl.indexOf('access_token') !== -1 ? fullUrl.split('=')[2].split('&')[0] : ''




    // AWS.config.update({ "accessKeyId": process.env.REACT_APP_ACCESS_ID, "secretAccessKey": process.env.REACT_APP_SECRET_ID, "region": "us-east-1" })
    if (idToken !== '' && accToken !== '') {

      cognitoidentityserviceprovider.getUser({ AccessToken: accToken }, (err, data) => {
        if (err) { // an error occurred
          console.log(err, err.stack)
          setAuthentic(false)
        }
        else {
          console.log(data);           // successful response
          setUserName(data.Username)
          setAuthentic(true)
        }
      })


      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'us-east-1:20197a84-4e22-4bd3-a118-71f5c2174eee',
        Logins: {
          "cognito-idp.us-east-1.amazonaws.com/us-east-1_QIT9K8OPo": idToken
        },
        region: 'us-east-1'

      })
    }

  }, [])

  const addFirst = () => {

    console.log("create trade and add trade")
    const docClient = new AWS.DynamoDB.DocumentClient();
    if (trades === null || trades === []) {
      console.log("add trade")
      var params = {
        TableName: "user",
        Item: {
          FirstName: "lolx",
          trades: [{
            posType: "buy",
            price: 123.23,
            stock: "Amazon"
          }]
        }
      }
      docClient.put(params, function (err, data) {
        if (err) {
          console.log(err.message)
          console.log('Please log in again - redirect to login ')
        } else {
          console.log(data)
        }
      })
    }

    else {
      console.log("add trade")
      var params = {
        TableName: "user",
        Key: { FirstName: "lolx" },
        UpdateExpression: "SET #c = list_append(#c, :vals)",
        ExpressionAttributeNames: {
          "#c": "trades"
        },
        ExpressionAttributeValues: {
          ":vals": [{ happy: 'mybad' }]
        },

      }
      docClient.update(params, function (err, data) {
        if (err) {
          console.log(err.message)
          console.log('Please log in again - redirect to login ')
        } else {
          console.log(data)
        }
      })
    }
  }

  //get trades - [check if logged in]
  useEffect(() => {

    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "user",
      KeyConditionExpression: 'FirstName = :i',
      ExpressionAttributeValues: {
        ':i': 'lolx'
      }
    }
    docClient.query(params, (err, data) => {
      if (err) {
        console.log(err)


      } else {
        //IF NO TRADES FIX THE PREFIX . TRADEStttt
        // console.log(data.Items[0].trades)
        if (data.Items !== null)
          console.log(data)
        updateTrades(data.Items)

      }
    })
  }, [])

  const deleteTrade = () => {

    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "user",
      Key: { FirstName: "lolx" },
      UpdateExpression: "SET #c = :vals",
      ExpressionAttributeNames: {
        "#c": "trades"
      },
      ExpressionAttributeValues: {
        ":vals": [{ happy: 'mybad' }, { sadness: 'crying' }]
      },

    }
    docClient.update(params, function (err, data) {
      if (err) {
        console.log(err.message)
        console.log('Please log in again - redirect to login ')
      } else {
        console.log(data)
      }
    })

  }


  const TradeForm = () => {
    const [posType, setPosType] = useState('')
    const [purchPrice, setpurchPrice] = useState('')
    const [Quantity, setQuantity] = useState('')
    const [Stock, setStock] = useState('')
    return (

      <div className='App_form'>
        <form className='App-form-content'>
          <label>
            posType:
            <input type="text" name="name" required={true} value={posType} onChange={(evt) => setPosType(evt.target.value)} />
          </label>
          <label>
            purchPrice:
            <input type="number" name="name" required={true} value={purchPrice} onChange={(evt) => setpurchPrice(evt.target.value)} />
          </label>
          <label>
            Quantity:
            <input type="text" name="name" required={true} value={Quantity} onChange={(evt) => setQuantity(evt.target.value)} />
          </label>
          <label>
            Stock:
            <input type="text" name="name" required={true} value={Stock} onChange={(evt) => setStock(evt.target.value)} />
          </label>
          <input type="submit" value="Submit" />
        </form>

      </div>
    )
  }

  return (
    isAuthentic ? (
      <div className="App">

        You Are signed in - {userName}
        <div>
          <button onClick={() => addFirst()}>Add trade</button>
          <button onClick={() => deleteTrade()}>Delete trade</button>


        </div>
        <TradeForm />
        {JSON.stringify(trades, null, 2)}

      </div>) : (

      <div className='App'>
        Please sign in
        <a href={"https://broker-manager.auth.us-east-1.amazoncognito.com/login?client_id=5k3gc7mkv41l9flj7lfursqor2&response_type=token&scope=aws.cognito.signin.user.admin+email+openid+phone+profile&redirect_uri=http://localhost:3000/"}>
          <button>Log In</button>
        </a>

      </div>
    )


  );
}

export default App;

