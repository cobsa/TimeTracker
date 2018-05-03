import express from 'express'
import bodyParser from 'body-parser'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
import { makeExecutableSchema } from 'graphql-tools'
import { find, filter, random } from 'lodash'
import mongoose, { Schema } from 'mongoose'

const mongoAddress = 'mongodb://localhost/timetracker'

// Connect to mongoDB
mongoose.connect(mongoAddress)
const db = mongoose.connection
db.on('error', () => console.log('Cannot connect to MongoDB'))
db.once('open', () => {
  const ObjectId = Schema.Types.ObjectId
  // Define mongoose schemas
  const userSchema = Schema({
    id: ObjectId,
    name: String,
    email: String
  })
  const User = mongoose.model('User', userSchema)
  const recordSchema = Schema({
    id: ObjectId,
    type: String,
    done: Boolean,
    start: Date,
    end: Date,
    uid: ObjectId
  })
  const Record = mongoose.model('Record', recordSchema)

  // Apollo config
  const typeDefs = `
    type Query {
        records(id: String!): [Record]
        user(id: String!): User
    }
    type Record { start: String, end: String, type: String, duration: Int, uid: String!, _id: String!, done: Boolean}
    type User { name: String!, _id: String!, email: String!, records: [Record], activeRecord: Record}

    type Mutation{
      addUser(
        name: String!
        email: String!
      ): User

      startRecord(
          start: String!
          type: String!
          uid: String!
      ): Record

      endRecord(
          id: String!
          end: String!
      ): Record
    }
    `

  const resolvers = {
    Query: {
      records: (_, { id }) => {
        return Record.find({ _id: id }, (err, product) => {
          if (err) {
          }
          return product
        })
      },
      user: (_, { id }) => {
        return User.findOne({ _id: id }, (err, product) => {
          return product
        })
      }
    },
    Mutation: {
      addUser: (_, { name, email }) => {
        const promise = User.create({ name, email })
        promise.then(product => {
          return product
        })
        return promise
      },
      startRecord: (_, { start, type, uid }) => {
        return Record.count({ uid, done: false })
          .exec()
          .then(count => {
            if (count === 0) {
              return Record.create({ type, start: new Date(start), uid, done: false }).then(
                product => {
                  return product
                }
              )
            }
          })

        /* return Record.create({ type, start: new Date(start), uid, done: false }).then(
          (err, product) => {
            console.log(err)
            console.log(product)
            return err
          }
        ) */
      },
      endRecord: (_, { id, end }) => {
        //Check that record in question is not ended already and modify end timestamp
        const promise = Record.findOneAndUpdate(
          { _id: id, end: undefined },
          { end: new Date(end), done: true },
          { new: true }
        ).exec()
        promise.then(product => {
          return product
        })
        return promise
      }
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

  const app = express()

  app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))

  if (process.env.NODE_ENV === 'development') {
    // GraphiQL, a visual editor for queries
    app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }))
  }

  app.listen(3000, () => console.log('Server is upp'))
})
