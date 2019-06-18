const { ApolloServer, gql } = require('apollo-server-express');
const { Schemata } = require('ne-schemata');

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
];

function getBooks() {
  return books.map(function(book) {
    return {
      ISBN: book.ISBN,
      title: book.title,
      author: authors.filter(function(author) {
        return author.books.includes(book.ISBN)
      })[0]
    };
  });
}

function getAuthors() {
  return authors.map(function(author) {
    return {
      name: author.name,
      books: books.filter(function(book) {
        return author.books.includes(book.ISBN)
      })
    };
  });
}

function updateISAN(obj, { currISAN, newISAN }, context, info) {
  const movie = movies.find(function(movie) {
    return movie.ISAN == currISAN;
  });

  if (!movie) {
    throw new Error(`No movie with ISAN ${currISAN} exists`);
  }

  movie.ISAN = newISAN;

  return `Updated ISAN for ${movie.title} from ${currISAN} to ${newISAN}`;
}

const queryTypes = new Schemata(
  gql`
    type Query {
      books: [Book],
      authors: [Author],
      movies: [Movie]
    }
  `
);

const dataTypes = Schemata.from(
  gql`
    type Mutation {
      updateISAN(currISAN: Int, newISAN: Int): String
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
  `
);

const typeDefs = queryTypes.mergeSDL(dataTypes).typeDefs;

const resolvers = {
  Query: {
    books: getBooks,
    authors: getAuthors,
    movies: () => movies
  },
  Mutation: {
    updateISAN: updateISAN
  }
};

const database = new ApolloServer({
  typeDefs,
  resolvers
});

module.exports = { database, dataTypes };