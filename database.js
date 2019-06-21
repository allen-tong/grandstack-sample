const { ApolloServer, gql } = require('apollo-server-express');
const { Schemata } = require('ne-schemata');
const { v1: neo4j } = require('neo4j-driver');
const { makeAugmentedSchema } = require('neo4j-graphql-js');

const sharedTypes = new Schemata(
  gql`
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
  `
);

const localTypes = new Schemata(
  gql`
    type Query {
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
        )
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