import logo from '../logo.svg';

import React, { memo, useEffect } from 'react';
// Import required AWS SDK clients and commands for Node.js

import AWS, { CognitoIdentityServiceProvider } from 'aws-sdk';
import { useState } from 'react';
import { useRef } from 'react';
import { returnDateTime } from './TimeFunction'


function App() {
  // const idToken = fullUrl.split('=')[1].split('&')[0]
  const [userName, setUserName] = useState('')
  const [isAuthentic, setAuthentic] = useState(false) //is account created 
  const [trades, updateTrades] = useState([])
  const [userTrades, allUserTrades] = useState([])
  const [isVerified, updateVerification] = useState(false) //email notification 

  var email = useRef(null)


  useEffect(() => {


    AWS.config.update({ region: 'us-east-1' })
    const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider()
    // AWS.config.region = 'us-east-1';
    const fullUrl = document.location.href
    var idToken = fullUrl.indexOf('id_token') !== -1 ? fullUrl.split('=')[1].split('&')[0] : ''
    var accToken = fullUrl.indexOf('access_token') !== -1 ? fullUrl.split('=')[2].split('&')[0] : ''



    if (idToken !== '' && accToken !== '') {

      cognitoidentityserviceprovider.getUser({ AccessToken: accToken }, (err, data) => {
        if (err) { // an error occurred
          console.log(err, err.stack)
          setAuthentic(false)
        }
        else {
          //console.log(data);           // successful response
          AWS.config.update({ "accessKeyId": process.env.REACT_APP_ACCESS_ID, "secretAccessKey": process.env.REACT_APP_SECRET_ID, "region": "us-east-1" })

          // AWS.config.credentials = new AWS.CognitoIdentityCredentials({
          //   IdentityPoolId: 'us-east-1:20197a84-4e22-4bd3-a118-71f5c2174eee',
          //   Logins: {
          //     "cognito-idp.us-east-1.amazonaws.com/us-east-1_QIT9K8OPo": idToken
          //   },
          //   region: 'us-east-1'
          // })

          email.current = data.UserAttributes[2].Value
          fetchIdentity()
          fetchTrades(data.Username)
          fetchAllTrades()
          setUserName(data.Username)

          setAuthentic(true)
        }
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

    const msgParam = {
      message: "added",
      emailTo: email.current,
      userName: userName,
      trade: tradeParams[0]
    }


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
          if (isVerified) {
            sendEmail(msgParam)
          }
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
          if (isVerified) {
            sendEmail(msgParam)
          }
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

        allUserTrades(data.Items)
      })
      .catch((err) => {
        console.error(err)
      })
  }
  //get trades - [check if logged in]
  const fetchTrades = (uName) => {
    console.log("rendedr")
    const docClient = new AWS.DynamoDB.DocumentClient();

    var params = {
      TableName: "user",
      KeyConditionExpression: 'FirstName = :i',
      ExpressionAttributeValues: {
        ':i': uName
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

    //keep deleted trade
    const deletedTrade = localTrades[index]
    //splice locally remove that index 
    localTrades.splice(index, 1)


    const msgParam = {
      message: "deleted",
      emailTo: email.current,
      userName: userName,
      trade: deletedTrade
    }

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
        if (isVerified) {
          sendEmail(msgParam)
        }
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
      <div className='dark:bg-gray-900 dark:text-gray-400 w-96 h-[60%] inline-block rounded-lg'>

        <div className='flex flex-col items-center justify-center h-full '>
          <div>
            Add Trade
          </div>
          <label className='flex flex-col w-[60%] m-3'>
            posType:
            <select onChange={(evt) => setPosType(evt.target.value)}>
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
          </label>
          <label className='flex flex-col w-[60%] m-3'>
            purchPrice:
            <input type="number" name="name" value={purchPrice} onChange={(evt) => setpurchPrice(evt.target.value)} />
          </label>
          <label className='flex flex-col w-[60%] m-3'>
            Quantity:
            <input type="number" name="name" value={Quantity} onChange={(evt) => setQuantity(evt.target.value)} />
          </label>
          <label className='flex flex-col w-[60%] m-3'>
            Stock:
            <input type="text" name="name" value={Stock} onChange={(evt) => setStock(evt.target.value)} />
          </label>
          <button
            className='mt-5 p-2 pl-5 pr-5 outline outline-gray-50'
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
      <div>
        <a className='text-lg font-semibold mb-7 block'>My Trades</a>
        <div className='overflow-y-auto h-64 relative shadow-md sm:rounded-lg dark:bg-gray-700'>

          <table className='w-full text-sm text-left text-gray-500 dark:text-gray-400'>
            <thead className='text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400'>
              <tr className=''>
                <th className='py-3 px-6'>Company</th>
                <th className='py-3 px-6'>Contact</th>
                <th className='py-3 px-6'>Country</th>
                <th className='py-3 px-6'>Country</th>
                <th className='py-3 px-6'>delete</th>
              </tr>
            </thead>

            <tbody className='h-3'>
              {trades?.map((trade, index) => {
                return (
                  <tr key={index} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700">
                    <td className={`py-3 px-6 ${(trade?.posType === "Buy" ? "text-green-600" : "text-red-800")}`}>{trade?.posType}</td>
                    <td className='py-3 px-6'>{trade?.price}</td>
                    <td className='py-3 px-6'>{trade?.stock}</td>
                    <td className='py-3 px-6'>{trade?.quantity}</td>
                    <td className='py-3 px-6 text-red-700' onClick={() => deleteTrade(index)}>DELETE</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    )


  }


  //all trades of everyone using broker 
  const AllTrades = () => {

    return (
      <div>
        <a className='text-lg font-semibold mb-7 block'>All trades</a>

        <div className='overflow-y-auto h-64 relative shadow-md sm:rounded-lg dark:bg-gray-700'>
          <table className='w-full text-sm text-left text-gray-500 dark:text-gray-400'>
            <thead className='text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400'>
              <tr className=''>
                <th className='py-3 px-6 '>Position Type</th>
                <th className='py-3 px-6'>Price</th>
                <th className='py-3 px-6'>Stock</th>
                <th className='py-3 px-6'>Quantity</th>

              </tr>
            </thead>

            <tbody className='h-3'>
              {
                userTrades?.map((userTrade) => {
                  if (userTrade.FirstName === userName) return
                  return userTrade.trades.map((trade, index) => {
                    return (
                      <tr key={index} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 ">
                        <td className={`py-4 px-6 ${(trade?.posType === "Buy" ? "text-green-600" : "text-red-800")}`}>{trade?.posType}</td>
                        <td className='py-4 px-6'> {trade?.price}</td>
                        <td className='py-4 px-6'>  {trade?.stock}</td>
                        <td className='py-4 px-6'>  {trade?.quantity}</td>
                      </tr>
                    )
                  })
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    )


  }



  //fetch identity 
  const fetchIdentity = () => {

    const ses = new AWS.SES({ region: "us-east-1" })

    var params = {
      IdentityType: "EmailAddress",

      MaxItems: 123,
      NextToken: ""
    };
    ses.listIdentities(params).promise()
      .then((data) => {
        console.log(data)
        const identities = data.Identities
        const isVerified = identities.includes(email.current)
        console.log(isVerified)

        updateVerification(isVerified)

      })
      .catch((err) => {
        console.log(err)
      })

  }
  //send identity email to users 
  const sendIdentiyEmail = () => {
    const ses = new AWS.SES({ region: "us-east-1" })
    var params = {
      EmailAddress: email.current
    };
    ses.verifyEmailIdentity(params, function (err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else console.log(data);           // successful response

    })
  }

  const sendEmail = (msgParam) => {

    const message = msgParam.message
    const emailTo = msgParam.emailTo
    const userName = msgParam.userName
    const trade = msgParam.trade


    const ses = new AWS.SES({ region: "us-east-1" })

    const params = {
      Destination: {
        ToAddresses: [emailTo]
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data:
              `Hello ${userName} \n 
              you have successfully ${message} the trade. Here is what was ${message} \n
              Stock - ${trade?.stock} \n
              Quantity - ${trade?.quantity} \n
              Price - ${trade?.price} \n
              Position Type - ${trade?.posType} \n
              Thank you
              `
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: `Trade ${message} on ${returnDateTime()}`
        }
      },
      Source: "hamzah1010@hotmail.co.uk"
    }
    ses.sendEmail(params).promise()
      .then((res) => console.log(res))
      .catch((err) => console.log(err))
  }


  return (
    // if authentic show main page else show log in 
    isAuthentic ? (
      <div className="bg-red-700 w-screen h-screen ">

        {/* navbar showing user name  */}
        <div className='bg-slate-300 h-[5%] w-screen flex items-center'>
          <div className='flex-grow ml-5'>
            {<a
              className={isVerified ? ` font-bold ` : `hover:bg-gray-900 hover:text-white rounded-lg p-2 cursor-pointer hover:shadow-lg hover:shadow-indigo-900/100`}
              onClick={() => isVerified ? "" : sendIdentiyEmail()}>
              {isVerified ? "Notifications On" : "Notifications Off - Click Me"}
            </a>}
          </div>
          <div className='text-center w-64'>
            You Are signed in - {userName}
          </div>
          <div className='mr-5'>
            <a className='hover:bg-gray-900 hover:text-white rounded-lg p-2 cursor-pointer hover:shadow-lg hover:shadow-indigo-900/100' href={'http://localhost:3000/'}>Sign Out</a>
          </div>
        </div>

        {/* divide screen in two show form and my trades on left*/}
        <div className='bg-gray-500 w-[50%] h-[95%] float-left flex flex-col justify-center items-center'>

          <TradeForm />

        </div>

        {/* Divide screen in two display all trades on the right  */}
        <div className='bg-gray-500 w-[50%] h-[95%] float-right flex justify-evenly flex-col'>

          {/* tables with button to display  */}
          <div className='p-5 text-center'>
            {/* <div className={`${(trades.length !== 0) ? "hidden " : "text-lg font-semibold outline inline p-5 outline-white"}`}>
              <button onClick={fetchTrades}>Fetch My Trades</button>
            </div> */}
            {

              <MyTrades />

            }
          </div>

          {/* tables with button to display */}
          <div className='p-5 text-center'>

            {/* <div className={`${(userTrades.length !== 0) ? "hidden" : "text-lg font-semibold outline inline p-5 outline-white"}`}>
              <button onClick={fetchAllTrades}>Fetch All Trades</button>
            </div> */}
            {

              <AllTrades />

            }
          </div>

          {/* <button onClick={() => fetchIdentity()}>lol</button> */}
          {/* <button onClick={() => sendEmail()}>checkEmailVerification</button> */}

        </div>
      </div>
    ) : (

      <div className='w-screen h-screen bg-slate-500 flex items-center justify-center'>
        <div className='text-xl text-center'>
          <div className=''>Please Log In </div>
          <br />
          <a href={"https://broker-manager.auth.us-east-1.amazoncognito.com/login?client_id=5k3gc7mkv41l9flj7lfursqor2&response_type=token&scope=aws.cognito.signin.user.admin+email+openid+phone+profile&redirect_uri=https://main.d1smwv99pkdf97.amplifyapp.com/"}>
            <button className='border-2 border-blue-50 p-2'>Log In</button>
          </a>
        </div>
      </div>

    )


  );
}

export default App;

