const v4 =  require('uuid').v4()
const AWS = require('aws-sdk')
const dynamodb = new AWS.DynamoDB.DocumentClient()

const tableName = 'Users'


module.exports.createUser = async (event, context, callback) => {

  const userId = v4
  const transactItems = {
    TransactItems : [
      {
        Put: {
          TableName: tableName,
          Item: {
            'PK': "USER#" + userId,
            'UserId': userId,
            'FirstName': event.body.firstName,
            'lastName': event.body.lastName,
            'Email': event.body.email,
            'RewardBalance': event.body.rewardBalance,
          },
          ConditionExpression: 'attribute_not_exists(PK)'
        }
      },
      {
        Put: {
          TableName: tableName,
          Item: {
            'PK': "EMAIL#" + event.body.email
          },
          ConditionExpression: 'attribute_not_exists(PK)'
        }
      }
    ]
  }

  dynamodb.transactWrite( transactItems )
    .promise()
    .then( () => {
      callback( null, {
        statusCode: 200,
        msg: 'User created'
      })
    }).catch( (err) => {
      console.log( err )
      callback( null, {
        statusCode: 400,
        body: err.message
      })
    })
};

module.exports.getUser = (event, context, callback) => {

  const params = {
    TableName: tableName, 
    Key: { 
      'PK': "USER#" + event.pathParameters.userId
    }
  }

  dynamodb.get(params)
    .promise()
    .then( data => {
      if( data.Item ) {
        callback( null, {
          statusCode: 200,
          data
        })
      } else {
        callback( null, {
          statusCode: 400,
          body: 'No user exist'
        })
      }
    }).catch( (err) => {
      console.log( err )
    })
  
};


module.exports.updateUser = (event, context, callback) => {
  const userId = event.pathParameters.userId
  const item   = {
    'PK': "USER#" + userId,
    'UserId': userId,
    'FirstName': event.body.firstName,
    'lastName': event.body.lastName,
    'Email': event.body.email
  }
  const params = {
    TableName: tableName, 
    Item: item,
    ConditionExpression: 'attribute_exists(PK)'
  }

  dynamodb.put( params )
    .promise()
    .then( () => {
      callback( null, {
        statusCode: 200,
        msg: 'User updated'
      })
    }).catch( (err) => {
      console.log( err )
      callback( null, {
        statusCode: 400,
        body: err.message
      })
    })
};



module.exports.deleteUser = async (event, context, callback) => {
  const userId = event.pathParameters.userId
  
  const params = {
    TableName: tableName,
    Key: {
      'PK': 'USER#' + userId
    }
  }

  dynamodb.get( params )
    .promise()
    .then( data => {
      let email = data.Item?.Email
  
      const transactItems = {
        TransactItems: [
          {
            Delete: {
              TableName: tableName,
              Key: {
                'PK': "USER#" + userId
              },
              ConditionExpression: 'attribute_exists(PK)'
            }
          },
          {
            Delete: {
              TableName: tableName,
              Key: {
                'PK': "EMAIL#" + email
              },
              ConditionExpression: 'attribute_exists(PK)'
            }
          }
        ]
    }
    dynamodb.transactWrite( transactItems )
      .promise()
      .then( () => {
        callback( null, {
          statusCode: 200,
          msg: 'User deleted'
        })
      }).catch( (err) => {
        console.log( err )
        callback( null, {
          statusCode: 400,
          body: err.message
        })
    })
  })
};

module.exports.updateUserRewards = async (event, context, callback) => {

  const { operator, amount } = event.body
  const userId = event.pathParameters.userId
  let params   = {}

  if( operator ) {
    params = {
      TableName: tableName,
      Key: {
        'PK': 'USER#' + userId
      },
      ConditionExpression: 'attribute_exists(PK)',
      UpdateExpression: 'SET RewardBalance = RewardBalance + :amount',
      ExpressionAttributeValues: {
        ":amount": amount
      }
    }
  }else {
    params = {
      TableName: tableName,
      Key: {
        'PK': 'USER#' + userId
      },
      ConditionExpression: 'attribute_exists(PK) AND RewardBalance >= :amount AND RewardBalance > :zero',
      UpdateExpression: 'SET RewardBalance = RewardBalance - :amount',
      ExpressionAttributeValues: {
        ":amount": amount,
        ":zero": 0
      }
    }
  }
  
  dynamodb.update( params )
      .promise()
      .then( () => {
        callback( null, {
          statusCode: 200,
          msg: 'Reward updated'
        })
      }).catch( (err) => {
        console.log( err )
        callback( null, {
          statusCode: 400,
          body: err.message
        })
    })

};
