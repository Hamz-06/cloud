import { AWS, ses } from './AwsConfig'
import { returnDateTime } from './TimeFunction';
//fetch verified users (check if hes verified so we can send him notifications) 
const fetchIdentity = (email, updateVerification) => {

    var params = {
        IdentityType: "EmailAddress",

        MaxItems: 123,
        NextToken: ""
    };
    //fetch all users who are verified 
    ses.listIdentities(params).promise()
        .then((data) => {
            console.log(data)
            const identities = data.Identities
            const isVerified = identities.includes(email)
            console.log(isVerified)
            //if verified update verification
            updateVerification(isVerified)
        })
        .catch((err) => {
            console.log(err)
        })

}
//send identity email to users if they are not verified 
const sendIdentiyEmail = (email) => {

    var params = {
        EmailAddress: email
    };
    ses.verifyEmailIdentity(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data);           // successful response

    })
}
//send email to users depending on wether they have added or deleted a trade 
const sendEmail = (msgParam) => {
    //get message
    const message = msgParam.message
    const emailTo = msgParam.emailTo
    const userName = msgParam.userName
    const trade = msgParam.trade
    //EMAIL TEMPLATE 
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
export { fetchIdentity, sendIdentiyEmail, sendEmail }