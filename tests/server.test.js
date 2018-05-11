import rp from 'request-promise'
import randomstring from 'randomstring'

import { startServer, stopServer } from '../src/server'
describe('Integration tests', () => {
  const port = 3001
  const requestHelper = (query, token = undefined) => {
    return {
      method: 'post',
      uri: `http://localhost:${port}/graphql?`,
      json: true,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        query
      },
      resolveWithFullResponse: true
    }
  }

  beforeAll(done => {
    startServer(done, port)
  })

  afterAll(done => {
    stopServer(done)
  })

  test('Should set NODE_ENV to test', () => {
    expect(process.env.NODE_ENV).toEqual('test')
  })
  test('Server should make new user', () => {
    const query = `
    mutation {
      addUser(name: "Random name" email:"${randomstring.generate({
        length: 7
      })}@example.com" password: "password" passwordAgain: "password") {
        _id
      }
    }
    `
    return rp(requestHelper(query)).then(response => {
      const uid = response.body.data.addUser['_id']
      expect(uid.length).toBeGreaterThanOrEqual(20)
    })
  })
  test('Server should NOT make new user', () => {
    const query = `
      mutation {
        addUser(name: "Random name" email:"${randomstring.generate({
          length: 7
        })}@example.com" password: "password" passwordAgain: "pasword") {
          _id
        }
      }
      `
    return rp(requestHelper(query)).then(response => {
      expect(response.body.errors.length).toEqual(1)
    })
  })
  test('Server should make one user and return error on second', () => {
    const email = randomstring.generate({ length: 10 })
    const query = `
      mutation {
        addUser(name: "Random name" email:"${email}@example.com" password: "password" passwordAgain: "password") {
          _id
        }
      }
      `
    // First request should be completed
    return rp(requestHelper(query)).then(response => {
      const uid = response.body.data.addUser['_id']
      expect(uid.length).toBeGreaterThanOrEqual(20)
    })
    // Second should fail
    return rp(requestHelper(query)).then(response => {
      expect(response.body.errors.length).toEqual(1)
    })
  })
  test('Should create user, login, start and end record', () => {
    const password = randomstring.generate({ length: 12 })
    const email = randomstring.generate({ length: 10 })
    const queries = [
      `
      mutation {
        addUser(name: "Random name" email:"${email}@example.com" password: "${password}" passwordAgain: "${password}") {
          _id
        }
      }
      `,
      `
      mutation {
        loginUser(email: "${email}@example.com" password: "${password}")
      }
      `,
      `mutation {
        startRecord(start:"${new Date()}" type:"workout") {
          _id
        }
      }`
    ]
    return rp(requestHelper(queries[0])).then(response => {
      expect(response.body.data.addUser._id).toBeDefined()
      // Should return valid jwt
      let token
      return rp(requestHelper(queries[1])).then(response => {
        token = response.body.data.loginUser
        expect(token.length).toBeGreaterThan(12)
        return rp(requestHelper(queries[2], token)).then(response => {
          const id = response.body.data.startRecord._id
          expect(id.length).toBeGreaterThan(12)
          const endQuery = `mutation{
            endRecord(end: "${new Date()}" id:"${id}") {
              done
            }
          }`
          return rp(requestHelper(endQuery, token)).then(response => {
            expect(response.body.data.endRecord.done).toBeTruthy()
          })
        })
      })
    })
  })
})
