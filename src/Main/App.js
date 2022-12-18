import logo from '../logo.svg';

import React, { useEffect } from 'react';
// Import required AWS SDK clients and commands for Node.js
import { Routes, Route, useParams, BrowserRouter } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { CognitoIdentityProviderClient, AddCustomAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import AWS, { CognitoIdentityServiceProvider } from 'aws-sdk';
import { useState } from 'react';
import { useRef } from 'react';


function App() {
  // const idToken = fullUrl.split('=')[1].split('&')[0]
  const [userName, setUserName] = useState('')
  const [isAuthentic, setAuthentic] = useState(false)
  const [trades, updateTrades] = useState([])
  const [userTrades, allUserTrades] = useState([])

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
          //console.log(data);           // successful response
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


  const addFirst = (stock, Quantity, purchPrice, posType) => {

    const docClient = new AWS.DynamoDB.DocumentClient();

    const tradeParams = [{
      posType: posType,
      price: purchPrice,
      stock: stock,
      quantity: Quantity
    }]

    console.log(tradeParams)
    // if (0 == 0) return
    if (trades === null || trades.length === 0) {
      console.log("create trade and add trade")
      var params = {
        TableName: "user",
        Item: {
          FirstName: userName,
          trades: tradeParams
        }
      }
      docClient.put(params, function (err, data) {
        if (err) {
          console.log(err.message)
          console.log('Please log in again - redirect to login ')
          setAuthentic(false)
        } else {
          console.log("Added succefully")
          updateTrades(params.Item.trades)
        }
      })
    }

    else {
      console.log("add trade")

      var params = {
        TableName: "user",
        Key: { FirstName: userName },
        UpdateExpression: "SET #c = list_append(#c, :vals)",
        ExpressionAttributeNames: {
          "#c": "trades"
        },
        ExpressionAttributeValues: {
          ":vals": tradeParams
        },
      }
      docClient.update(params, function (err, data) {
        if (err) {
          console.log(err.message)
          console.log('Please log in again - redirect to login ')
        } else {
          updateTrades(current => [...current, tradeParams[0]]);
        }
      })
    }
  }
  const fetchAllTrades = () => {
    const docClient = new AWS.DynamoDB.DocumentClient();
    docClient.scan({
      TableName: "user"
    }).promise()
      .then(data => {
        console.log(data.Items)
        allUserTrades(data.Items)
      })
      .catch((err) => {
        console.error(err)
        setAuthentic(false)
      })
  }
  //get trades - [check if logged in]
  const fetchTrades = () => {

    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: "user",
      KeyConditionExpression: 'FirstName = :i',
      ExpressionAttributeValues: {
        ':i': userName
      }
    }
    docClient.query(params, (err, data) => {
      if (err) {
        console.log(err)
        console.log("no entity created yet")

      } else {
        //IF NO TRADES FIX THE PREFIX . TRADEStttt
        // console.log(data.Items[0].trades)
        if (data.Items.length !== 0)
          // console.log(data)
          updateTrades(data.Items[0].trades)

      }
    })

  }


  const deleteTrade = (index) => {

    const docClient = new AWS.DynamoDB.DocumentClient();
    var localTrades = trades
    localTrades.splice(index, 1)

    var params = {
      TableName: "user",
      Key: { FirstName: userName },
      UpdateExpression: "SET #c = :vals",
      ExpressionAttributeNames: {
        "#c": "trades"
      },
      ExpressionAttributeValues: {
        ":vals": localTrades
      },

    }
    docClient.update(params, function (err, data) {
      if (err) {
        console.log(err.message)
        console.log('Please log in again - redirect to login ')
        isAuthentic(false)
      } else {
        console.log(data)

        updateTrades([...localTrades])
      }
    })
  }

  // Trade form to add trades 
  const TradeForm = () => {
    const [posType, setPosType] = useState('Buy')
    const [purchPrice, setpurchPrice] = useState('')
    const [Quantity, setQuantity] = useState('')
    const [Stock, setStock] = useState('')

    return (
      <div className='bg-green-600 w-96 h-[50%] inline-block'>

        <div className='flex flex-col items-center justify-center h-full '>

          <label className='flex flex-col w-[60%]'>
            posType:
            <select onChange={(evt) => setPosType(evt.target.value)}>
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
          </label>
          <label className='flex flex-col w-[60%]'>
            purchPrice:
            <input type="number" name="name" value={purchPrice} onChange={(evt) => setpurchPrice(evt.target.value)} />
          </label>
          <label className='flex flex-col w-[60%]'>
            Quantity:
            <input type="number" name="name" value={Quantity} onChange={(evt) => setQuantity(evt.target.value)} />
          </label>
          <label className='flex flex-col w-[60%]'>
            Stock:
            <input type="text" name="name" value={Stock} onChange={(evt) => setStock(evt.target.value)} />
          </label>
          <button
            className='mt-5 p-2'
            onClick={() => (Stock !== '' && Quantity !== '' && purchPrice !== '' && posType !== '') ? addFirst(Stock, Quantity, purchPrice, posType) : ''}>
            click
          </button>
        </div>
      </div >
    )
  }

  // my trades table
  const MyTrades = () => {


    return (
      <table className='border-separate border-spacing-4 border border-black h-20 text-left w-full rounded-lg'>
        <thead className='flex'>
          <tr className='flex w-full mb-4'>
            <th className='p-4 w-1/4'>Company</th>
            <th className='p-4 w-1/4'>Contact</th>
            <th className='p-4 w-1/4'>Country</th>
            <th className='p-4 w-1/4'>Country</th>
            <th className='p-4 w-1/4'>delete</th>
          </tr>
        </thead>

        <tbody className='bg-grey-light flex flex-col items-center justify-between overflow-y-scroll w-full h-40'>
          {trades?.map((trade, index) => {
            return (
              <tr key={index} className="flex w-full">
                <td className='p-4 w-1/4'>{trade?.posType}</td>
                <td className='p-4 w-1/4'>{trade?.price}</td>
                <td className='p-4 w-1/4'>{trade?.stock}</td>
                <td className='p-4 w-1/4'>{trade?.quantity}</td>
                <td className='p-4 w-1/4' onClick={() => deleteTrade(index)}>DELETE</td>
              </tr>
            )
          })}
        </tbody>
      </table>

    )


  }


  //all trades of everyone using broker 
  const AllTrades = () => {

    return (
      <table className='border-separate border-spacing-4 border border-black h-28 text-left w-full rounded-lg'>
        <thead className='flex'>
          <tr className='flex w-full mb-4'>
            <th className='p-4 w-1/4'>Company</th>
            <th className='p-4 w-1/4'>Contact</th>
            <th className='p-4 w-1/4'>Country</th>
            <th className='p-4 w-1/4'>Country</th>

          </tr>
        </thead>

        <tbody className='bg-grey-light flex flex-col items-center justify-between overflow-y-scroll w-full h-40'>
          {
            userTrades?.map((userTrade) => {
              if (userTrade.FirstName === userName) return
              return userTrade.trades.map((trade, index) => {
                return (
                  <tr key={index} className="flex w-full">
                    <td className='p-4 w-1/4'>{trade?.posType}</td>
                    <td className='p-4 w-1/4'> {trade?.price}</td>
                    <td className='p-4 w-1/4'>  {trade?.stock}</td>
                    <td className='p-4 w-1/4'>  {trade?.quantity}</td>
                  </tr>
                )
              })
            })
          }
        </tbody>
      </table>
    )


  }


  return (
    // if authentic show main page else show log in 
    isAuthentic ? (
      <div className="bg-red-700 w-screen h-screen">

        {/* navbar showing user name  */}
        <div className='bg-slate-100 h-[4%] w-screen flex flex-row-reverse items-center'>
          <div className='text-center w-64'>
            You Are signed in - {userName}
          </div>
          <div>
            <a href={'http://localhost:3000/'}>Sign Out</a>
          </div>
        </div>

        {/* divide screen in two show form and my trades on left*/}
        <div className='bg-amber-600 w-[50%] h-[96%] float-left flex flex-col justify-center items-center'>

          <TradeForm />

        </div>

        {/* Divide screen in two display all trades on the right  */}
        <div className='bg-yellow-300 w-[50%] h-[96%] float-right'>

          <div className='p-5'>



            <div>
              <button onClick={fetchTrades}>Fetch my</button>
            </div>

            <MyTrades />





          </div>

          <div className='p-5'>
            {
              (true) ? <AllTrades /> : ''



            }
          </div>



          <div>
            <button onClick={fetchAllTrades}>Fetch all</button>
          </div>


        </div>
      </div>
    ) : (

      <div className='w-screen h-screen bg-slate-500 flex items-center justify-center'>
        <div className='text-xl text-center'>
          <div className=''>Please Log in </div>
          <br />
          <a href={"https://broker-manager.auth.us-east-1.amazoncognito.com/login?client_id=5k3gc7mkv41l9flj7lfursqor2&response_type=token&scope=aws.cognito.signin.user.admin+email+openid+phone+profile&redirect_uri=http://localhost:3000/"}>
            <button className='border-2 border-blue-50 p-2'>Log In</button>
          </a>
        </div>
      </div>

    )


  );
}

export default App;

