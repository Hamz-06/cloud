import { docClient } from "./AwsConfig"

//fetch all trades using doc client scan 
const fetchAllTrades = (allUserTrades) => {

  docClient.scan({
    TableName: "user"
  }).promise()
    .then(data => {
      //update trade array
      allUserTrades(data.Items)
    })
    .catch((err) => {
      console.error(err)
    })
}

//get trades of current user 
const fetchTrades = (uName, updateTrades) => {
  //param = gets info of current user via username  
  var params = {
    TableName: "user",
    KeyConditionExpression: 'FirstName = :i',
    ExpressionAttributeValues: {
      ':i': uName
    }
  }
  //submits that data using query via doc client 
  docClient.query(params, (err, data) => {
    if (err) {
      console.log(err)
      console.log("no entity created yet")

    } else {

      if (data.Items.length !== 0)
        // console.log(data)
        //update user trades when data is fetched 
        updateTrades(data.Items[0].trades)

    }
  })

}
//export 
export { fetchAllTrades, fetchTrades }