import express from 'express'
import bodyParser from 'body-parser'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
import { makeExecutableSchema } from 'graphql-tools'

import mongoose from 'mongoose'

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
      return null
    }
    case 'test': {
      return {
        url: 'mongodb://localhost/test',
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

    app.use(
      '/graphql',
      bodyParser.json(),
      graphqlExpress(req => {
        return {
          schema,
          context: {
            token: req.headers.authorization
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
