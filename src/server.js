import express from 'express'
import bodyParser from 'body-parser'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
import { makeExecutableSchema } from 'graphql-tools'
import cors from 'cors'
import mongoose from 'mongoose'
import { GraphQLScalarType } from 'graphql'
import { Kind } from 'graphql/language'

import { Record } from './mongoose/models/models'
import MongooseService from './mongoose/resolvers/resolvers'
import typeDefs from './graphql/types/types'

const mongoConfig = () => {
  switch (process.env.NODE_ENV) {
    case 'development': {
      return {
        url: 'mongodb://localhost/timetracker',
        config: {
          auto_reconnect: true
        }
      }
    }
    case 'production': {
      return {
        url: 'mongodb://localhost/timetracker',
        config: {
          auto_reconnect: true
        }
      }
    }
    case 'test': {
      return {
        url: 'mongodb://localhost/test',
        config: {
          auto_reconnect: true
        }
      }
    }
    default: {
      return {
        url: 'mongodb://localhost/timetracker',
        config: {
          auto_reconnect: true
        }
      }
    }
  }
}

let serverInstance
const app = express()
const startServer = (done, port) => {
  // Connect to mongoDB
  mongoose.connect(mongoConfig().url, mongoConfig().config)
  const db = mongoose.connection
  db.on('error', () => console.log('Cannot connect to MongoDB'))
  db.once('open', () => {
    const resolvers = {
      Date: new GraphQLScalarType({
        name: 'Date',
        description: 'Serializes Date as ISO string',
        parseValue(value) {
          return new Date(value) // value from the client
        },
        serialize(value) {
          return value.toISOString() // value sent to the client
        },
        parseLiteral(ast) {
          if (ast.kind === Kind.STRING) {
            return ast.value // ast value is always in string format
          }
          return null
        }
      }),
      Query: {
        records: MongooseService.records,
        user: MongooseService.user
      },
      Mutation: {
        addUser: MongooseService.addUser,
        loginUser: MongooseService.loginUser,
        startRecord: MongooseService.startRecord,
        endRecord: MongooseService.endRecord
      },
      User: {
        records: user => {
          return Record.find({ uid: user['_id'] }, (err, product) => {
            return product
          })
        },
        activeRecord: user => {
          return Record.findOne({ uid: user['_id'], done: false })
        }
      }
    }

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    })

    // Add cors support
    app.use(cors())

    app.use(
      '/graphql',
      bodyParser.json(),
      graphqlExpress(req => {
        return {
          schema,
          context: {
            token: req.headers.authorization === '' ? undefined : req.headers.authorization
          }
        }
      })
    )

    if (process.env.NODE_ENV === 'development') {
      // GraphiQL, a visual editor for queries
      app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }))
    }

    serverInstance = app.listen(port, () => {
      console.log('Server online at port: ' + port)
      done()
    })
  })
}

const stopServer = done => {
  serverInstance.close(() => {
    done()
  })
}
if (process.env.NODE_ENV !== 'test') {
  startServer(() => null, 3000)
}

export { startServer, stopServer }
