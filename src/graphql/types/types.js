const typeDefs = `
    scalar Date
    enum RecordType {
        WORKOUT
        WORK
        SLEEP
        FREETIME
    }
    type Query {
        records: [Record]
        user: User!
    }
    type Record { start: Date, end: Date, type: RecordType, uid: String!, _id: String!, done: Boolean}
    type User { name: String!, _id: String!, email: String!, records: [Record], activeRecord: Record}

    type Mutation{
      addUser(
        name: String!
        email: String!
        password: String!
        passwordAgain: String!
      ): User

      loginUser(
        email: String!
        password: String!
      ): String

      startRecord(
          start: String!
          type: String!
      ): Record

      endRecord(
          id: String!
          end: String!
      ): Record
    }
    `

export default typeDefs
