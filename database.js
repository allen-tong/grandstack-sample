const express = require('express');
const bodyParser = require('body-parser');
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const { makeExecutableSchema } = require('graphql-tools');

const books = [
  {
    ISBN: 1,
    title: "Harry Potter and the Sorcerer's Stone",
    author: 'J.K. Rowling',
  },
  {
    ISBN: 2,
    title: 'Jurassic Park',
    author: 'Michael Crichton',
  },
  {
    ISBN: 3,
    title: "Eragon",
    author: 'Christopher Paolini',
  },
  {
    ISBN: 4,
    title: 'The Hound of the Baskervilles',
    author: 'Arthur Conan Doyle',
  }
];
const authors = [
  {
    name: {
      fullName: 'J.K. Rowling',
      givenName: 'Joanne',
      familyName: 'Rowling'
    },
    books: [
      1
    ]
  },
  {
    name: {
      fullName: 'Michael Crichton',
      givenName: 'Michael',
      familyName: 'Chrichton'
    },
    books: [
      2
    ]
  },
  {
    name: {
      fullName: 'Christopher Paolini',
      givenName: 'Christopher',
      familyName: 'Paolini'
    },
    books: [
      3
    ]
  },
  {
    name: {
      fullName: 'Arthur Conan Doyle',
      givenName: 'Arthur',
      familyName: 'Doyle'
    },
    books: [
      4
    ]
  }
];
const movies = [
  {
    ISAN: 1,
    title: 'Detective Pikachu'
  }
]

function getBooks() {
  return books.map(function(book) {
    return {
      ISBN: book.ISBN,
      title: book.title,
      author: authors.filter(function(author) {
        return author.books.includes(book.ISBN)
      })[0]
    }
  })
}

function getAuthors() {
  return authors.map(function(author) {
    return {
      name: author.name,
      books: books.filter(function(book) {
        return author.books.includes(book.ISBN)
      })
    }
  })
}

const typeDefs = `
  type Query {
    books: [Book],
    authors: [Author],
    movies: [Movie]
  }
  type Book {
    ISBN: Int,
    title: String,
    author: Author
  }
  type Author {
    name: Name,
    books: [Book]
  }
  type Name {
    fullName: String,
    givenName: String,
    familyName: String
  }
  type Movie {
    ISAN: Int,
    title: String
  }
`;

const resolvers = {
  Query: {
    books: getBooks,
    authors: getAuthors,
    movies: () => movies
  }
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const app = express();
app.use('/database', bodyParser.json(), graphqlExpress({ schema }));
app.use('/dbgiql', graphiqlExpress({ endpointURL: '/database' }));

module.exports = app