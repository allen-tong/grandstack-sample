const { ApolloServer, gql } = require('apollo-server-express');
const { Schemata } = require('ne-schemata');
const { v1: neo4j } = require('neo4j-driver');
const { makeAugmentedSchema } = require('neo4j-graphql-js');

const sharedTypes = new Schemata(
  gql`
    type User {
      username: String
    }
    type Book {
      ISBN: ID,
      title: String
    }
    type Author {
      name: String
    }
    type Movie {
      ISAN: ID,
      title: String
    }
    type Director {
      name: String
    }
  `
);

const localTypes = new Schemata(
  gql`
    type Query {
      user(username: String): User
        @cypher(statement:
          "MATCH (user:User {username: $username}) RETURN user"
        ),
      book(ISBN: ID): Book
        @cypher(statement:
          "MATCH (book:Book {ISBN: $ISBN}) RETURN book"
        ),
      books: [Book],
      authors: [Author],
      movies: [Movie]
    }
    type Mutation {
      RelateAuthorToBook(authorName: String, bookISBN: ID, year: Int): Boolean
        @cypher(statement:
          """
          MATCH (author:Author {name: $authorName})
          MATCH (book:Book {ISBN: $bookISBN})
          MERGE (author)-[rel:WROTE {year: $year}]->(book)
          RETURN exists(()-[rel]->())
          """
        ),
      RelateDirectorToMovie(directorName: String, movieISAN: ID): Boolean
        @cypher(statement:
          """
          MATCH (director:Director {name: $directorName})
          MATCH (movie:Movie {ISAN: $movieISAN})
          MERGE (director)-[rel:DIRECTED]->(movie)
          RETURN exists(()-[rel]->())
          """
        ),
      Checkout(username: String, ISBN: ID): Boolean
        @cypher(statement:
          """
          MATCH (user:User {username: $username})
          MATCH (book:Book {ISBN: $ISBN})
          MERGE (user)-[rel:BORROWING]->(book)
          RETURN exists(()-[rel]->())
          """
        )
    }
    type User {
      password: String,
      checkedOut: [Book]
        @relation(name: "BORROWING", direction: "OUT")
        @cypher(statement: "MATCH (this)-[:BORROWING]->(b:Book) RETURN b")
    }
    type Book {
      author: Author
        @relation(name: "WROTE", direction: "IN")
        @cypher(statement: "MATCH (a:Author)-[:WROTE]->(this) RETURN a")
    }
    type Author {
      books: [Book]
        @relation(name: "WROTE", direction: "OUT")
        @cypher(statement: "MATCH (this)-[:WROTE]->(b:Book) RETURN b")
    }
    type Movie {
      director: Director
        @relation(name: "DIRECTED", direction: "IN")
        @cypher(statement: "MATCH (d:Director)-[:DIRECTED]->(this) RETURN d")
    }
    type Director {
      movies: [Movie]
        @relation(name: "DIRECTED", direction: "IN")
        @cypher(statement: "MATCH (this)-[:DIRECTED]->(m:Movie) RETURN m")
    }
  `
);

const typeDefs = sharedTypes.mergeSDL(localTypes).typeDefs;
const schema = makeAugmentedSchema({ typeDefs });

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'letmein')
);

const database = new ApolloServer({
  schema,
  context: { driver }
});

module.exports = { database, sharedTypes };