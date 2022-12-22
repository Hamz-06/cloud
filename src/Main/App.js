import logo from '../logo.svg';

import React, { memo, useEffect } from 'react';
// Import required AWS SDK clients and commands for Node.js
import { AWS, cognitoidentityserviceprovider, docClient } from './AwsConfig'
import { fetchIdentity, sendIdentiyEmail, sendEmail } from './EmailConfig'
import { useState } from 'react';
import { useRef } from 'react';
import { fetchAllTrades, fetchTrades } from './FetchTrades';


function App() {
  // const idToken = fullUrl.split('=')[1].split('&')[0]
  const [userName, setUserName] = useState('')
  const [isAuthentic, setAuthentic] = useState(false) //is account created 
  const [trades, updateTrades] = useState([])
  const [userTrades, allUserTrades] = useState([])
  const [isVerified, updateVerification] = useState(false) //email notification 

  var email = useRef(null)


  useEffect(() => {
    //get url that is returned to us from logging in and extract idtoken and acctoken 
    const fullUrl = document.location.href
    var idToken = fullUrl.indexOf('id_token') !== -1 ? fullUrl.split('=')[1].split('&')[0] : ''
    var accToken = fullUrl.indexOf('access_token') !== -1 ? fullUrl.split('=')[2].split('&')[0] : ''


    if (idToken === '' && accToken === '') return setAuthentic(false)

    //check if user exists and is verified 
    cognitoidentityserviceprovider.getUser({ AccessToken: accToken }, (err, data) => {
      if (err) { // an error occurred
        //if err go back to log in page
        console.log(err, err.stack)
        setAuthentic(false)
      }
      else {
        //fetch email address and account info
        email.current = data.UserAttributes[2].Value
        fetchIdentity(email.current, updateVerification)
        fetchTrades(data.Username, updateTrades)
        fetchAllTrades(allUserTrades)
        setUserName(data.Username)
        setAuthentic(true)
      }
    })


  }, [])

  //add a trade to dynamo db
  const addTrade = (stock, Quantity, purchPrice, posType) => {
    //trade param that needs to be added as an array
    const tradeParams = [{
      posType: posType,
      price: purchPrice,
      stock: stock,
      quantity: Quantity
    }]
    //message param this we sent via email
    const msgParam = {
      message: "added",
      emailTo: email.current,
      userName: userName,
      trade: tradeParams[0]
    }

    //add trade using put function if first trade
    if (trades === null || trades.length === 0) {
      console.log("create trade and add trade")
      var params = {
        TableName: "user",
        Item: {
          FirstName: userName,
          trades: tradeParams
        }
      }
      //adds trade via docClient 
      docClient.put(params, function (err, data) {
        if (err) {
          console.log(err.message)
          console.log('Please log in again - redirect to login ')
          setAuthentic(false)
        } else {
          console.log("Added succefully")
          if (isVerified) {
            //if user is verified send an email
            sendEmail(msgParam)
          }
          //update trades
          updateTrades(params.Item.trades)
        }
      })
    }
    //if second trade add via update
    else {
      //trade param
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
            //send email if verifed 
            sendEmail(msgParam)
          }
          updateTrades(current => [...current, tradeParams[0]]);
        }
      })
    }
  }




  const deleteTrade = (index) => {
    //create local copy of trade and manipulate it
    var localTrades = trades

    //keep deleted trade (used to submit via email)
    const deletedTrade = localTrades[index]
    //splice locally remove that index from that array
    localTrades.splice(index, 1)

    const msgParam = {
      message: "deleted",
      emailTo: email.current,
      userName: userName,
      trade: deletedTrade
    }

    //param - used to delete that trade 
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
          //if working and verified send an email
          sendEmail(msgParam)
        }
        //update trades 
        updateTrades([...localTrades])
      }
    })
  }

  // Trade form to add trades 
  const TradeForm = () => {
    //values in form 
    //posType default is "buy"
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
            //onclick add trade and submit variables
            onClick={() => (Stock !== '' && Quantity !== '' && purchPrice !== '' && posType !== '') ? addTrade(Stock, Quantity, purchPrice, posType) : ''}>
            click
          </button>
        </div>
      </div >
    )
  }

  // my tradestable
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
                    {/* change text to green if buy and red if sell */}
                    <td className={`py-3 px-6 ${(trade?.posType === "Buy" ? "text-green-600" : "text-red-800")}`}>{trade?.posType}</td>
                    <td className='py-3 px-6'>{trade?.price}</td>
                    <td className='py-3 px-6'>{trade?.stock}</td>
                    <td className='py-3 px-6'>{trade?.quantity}</td>
                    {/* delete trade if clicked  */}
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
                // map through all user trades and show in a table 
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





  return (
    // MAIN PAGE - (login page below)
    isAuthentic ? (
      <div className="bg-red-700 w-screen h-screen ">

        {/* navbar showing user name  */}
        <div className='bg-slate-300 h-[5vh] w-screen flex items-center'>
          <div className='flex-grow ml-5'>
            {/* send an email to verify account if clicked  */}
            {<a
              className={isVerified ? ` font-bold ` : `hover:bg-gray-900 hover:text-white rounded-lg p-2 cursor-pointer hover:shadow-lg hover:shadow-indigo-900/100`}
              onClick={() => isVerified ? "" : sendIdentiyEmail(email.current)}>
              {isVerified ? "Notifications On" : "Notifications Off - Click Me"}
            </a>}
          </div>
          <div className='text-center w-64'>
            You Are signed in - {userName}
          </div>
          <div className='mr-5'>
            <a className='hover:bg-gray-900 hover:text-white rounded-lg p-2 cursor-pointer hover:shadow-lg hover:shadow-indigo-900/100' href={'https://side-branch.d1smwv99pkdf97.amplifyapp.com/'}>Sign Out</a>
          </div>
        </div>

        <div className='flex flex-col sm:flex-row '>

          {/* divide screen in two show form and my trades on left*/}
          <div className='bg-gray-500 w-[100vw] sm:w-[50%] h-[95vh] flex flex-col justify-center items-center'>

            <TradeForm />

          </div>
          {/* Divide screen in two display all trades on the right  */}
          <div className='bg-gray-500 w-[100vw] sm:w-[50%] h-[95vh] flex justify-evenly flex-col'>

            {/* tables with button to display  */}
            <div className='p-5 text-center'>

              {

                <MyTrades />

              }
            </div>

            {/* tables with button to display */}
            <div className='p-5 text-center'>
              {
                <AllTrades />
              }
            </div>

          </div>
        </div>

      </div>
    ) : (
      //LOGIN PAGE
      <div className='w-screen h-screen bg-slate-500 flex items-center justify-center'>
        <div className='text-xl text-center'>
          <div className=''>Please Log In </div>
          <br />
          <a href={"https://broker-manager.auth.us-east-1.amazoncognito.com/login?client_id=5k3gc7mkv41l9flj7lfursqor2&response_type=token&scope=aws.cognito.signin.user.admin+email+openid+phone+profile&redirect_uri=https://side-branch.d1smwv99pkdf97.amplifyapp.com/"}>
            <button className='border-2 border-blue-50 p-2'>Log In</button>
          </a>
        </div>
      </div>

    )


  );

}

export default App;

