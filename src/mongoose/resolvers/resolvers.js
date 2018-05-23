import bcrypt from 'bcrypt'
import { pipeResolvers } from 'graphql-resolvers'
import jwt from 'jsonwebtoken'

import { jwtProd } from '../../config/jwtSecret'

const jwtSecret = process.env.NODE_ENV === 'development' ? 'somesecret' : jwtProd

import { User, Record } from '../models/models'

// Helper function to extract uid from jwt and pass it to next resolver
const isAuthenticated = (root, args, context, info) => {
  if (context.token !== undefined) {
    const token = context.token.split(' ')[1]
    const payload = jwt.verify(token, jwtSecret)
    if (payload.uid !== undefined) {
      return User.count({ _id: payload.uid }).then(count => {
        if (count === 1) {
          return payload.uid
        }
      })
    }
  }
  return new Error('Unauthorized Access')
}

const records = pipeResolvers(isAuthenticated, (uid, {}) => {
  return Record.find({ uid }, (err, product) => {
    if (err) {
    }
    return product
  })
})

const user = pipeResolvers(isAuthenticated, (uid, {}) => {
  return User.findOne({ _id: uid }, (err, product) => {
    return product
  })
})

const addUser = (_, { name, email, password, passwordAgain }) => {
  // Check that passwords match and that email is not yet in db
  if (email === '') return new Error('Email can not be empty')
  if (password === '') return new Error('Password can not be empty')
  if (password === passwordAgain) {
    return bcrypt.hash(password, 10).then(hash => {
      return User.create({ name, email, password: hash })
        .then(product => {
          return product
        })
        .catch(err => {
          return new Error('Email already in use')
        })
    })
  }
  return new Error('Passwords do not match')
}
const loginUser = (_, { email, password }) => {
  return User.findOne({ email })
    .exec()
    .then(product => {
      if (product !== undefined) {
        return bcrypt.compare(password, product.password).then(res => {
          if (res) {
            // Return json webtoken
            const token = jwt.sign(
              {
                uid: product['_id']
              },
              jwtSecret
            )
            return token
          }
          return new Error('Username and/or password do not match') // Password not valid
        })
      }
      return new Error('Username and/or password do not match') // User not found
    })
}

const startRecord = pipeResolvers(isAuthenticated, (uid, { start, type }, context) => {
  return Record.count({ uid, done: false })
    .exec()
    .then(count => {
      if (count === 0) {
        return Record.create({
          type,
          start: new Date(start),
          uid: uid,
          done: false
        }).then(product => {
          return product
        })
      }
    })
})

const endRecord = pipeResolvers(isAuthenticated, (uid, { id, end }) => {
  //  Check that record in question is not ended already and modify end timestamp
  const promise = Record.findOneAndUpdate(
    { _id: id, end: undefined, uid },
    { end: new Date(end), done: true },
    { new: true }
  ).exec()
  promise.then(product => {
    return product
  })
  return promise
})

const MongooseService = {
  startRecord,
  endRecord,
  loginUser,
  addUser,
  records,
  user
}

export default MongooseService
