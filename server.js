const { ApolloServer, gql } = require('apollo-server-express');
const express = require('express');
const { print } = require('graphql');
require('isomorphic-fetch');
const { Schemata } = require('ne-schemata');
const { database, dataTypes } = require('./database.js');

// Cache
var books;

var users = [
  {
    id: 0,
    username: 'Guest',
    password: null,
    checkedOut: []
  }
];

var currentUser = 0;

function getUser(id) {
  return users[id];
}

function getUserInfo(id) {
  const user = getUser(id);
  return {
    username: user.username,
    checkedOut: user.checkedOut.map(function(ISBN) {
      return books.find(function(book) {
        return book.ISBN == ISBN;
      }).title;
    })
  };
}

function fakeSHA256(input) {
  const map = Array.prototype.map;
  return String.fromCharCode(
    ...map.call(
      input, 
      function(c) {
        return c.charCodeAt(0) + 1;
      }
    )
  );
}

function signUp(obj, {username, password}, context, info) {
  if (currentUser != 0) {
    throw new Error('Error: cannot sign up while signed in');
  }

  const existingUser = users.find(function(user) {
    return user.username == username;
  });
  if (existingUser) {
    throw new Error('Error: user with that username already exists');
  }

  const id = users.length;
  users.push({
    id: id,
    username: username,
    password: fakeSHA256(password + id),
    checkedOut: []
  });

  return getUserInfo(id);
}

function signIn(obj, {username, password}, context, info) {
  if (currentUser != 0) {
    throw new Error('Error: a user is already signed in');
  }

  const user = users.find(function(user) {
    return user.username == username && user.password == fakeSHA256(password + user.id);
  });

  if (!user) {
    throw new Error('Error: no user with that combination of username and password exists');
  }

  currentUser = user.id;

  return getUserInfo(user.id);
}

function signOut() {
  if (currentUser == 0) {
    throw new Error('Error: no user currently signed in');
  }

  currentUser = 0;

  return 'User successfully signed out';
}

function getBooks() {
  const query = print(
    gql`
      query getBooks {
        books {
          ISBN
          title
        }
      }
    `
  );
  return fetch('http://localhost:3000/database', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  })
    .then(res => res.json())
    .then(json => json.data.books);
}

async function checkout(obj, {ISBN}, context, info) {
  if (currentUser == 0) {
    throw new Error('Error: no user currently signed in');
  }
  if (checkedOut = getUser(currentUser).checkedOut.includes(ISBN)) {
    throw new Error('Error: you have already checked out that book');
  }

  books = await getBooks();
  const book = books.find(function(book) {
    return book.ISBN == ISBN;
  });

  if (book) {
    getUser(currentUser).checkedOut.push(book.ISBN);
    return `Checked out ${book.title}`;
  } else {
    throw new Error(`Error: no book with ISBN ${ISBN} exists`);
  }
}

function updateISAN(obj, { currISAN, newISAN }, context, info) {
  const query = print(
    gql`
      mutation updateISAN($currISAN: Int, $newISAN: Int) {
        updateISAN(currISAN: $currISAN, newISAN: $newISAN)
      }
    `
  );
  return fetch('http://localhost:3000/database', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: {
        currISAN,
        newISAN
      }
    })
  })
    .then(res => res.json())
    .then(json => json.data.updateISAN);
}

const libraryTypes = new Schemata(
  gql`
    type Query {
      user: UserInfo
    }
    type Mutation {
      signUp(username: String, password: String): UserInfo,
      signIn(username: String, password: String): UserInfo,
      signOut: String,
      checkout(ISBN: Int): String
    }
    type User {
      id: Int,
      username: String,
      password: String,
      checkedOut: [Int]
    }
    type UserInfo {
      username: String,
      checkedOut: [String]
    }
  `
);

const typeDefs = libraryTypes.mergeSDL(dataTypes).typeDefs;

const resolvers = {
  Query: {
    user: () => getUserInfo(currentUser)
  },
  Mutation: {
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    checkout: checkout,
    updateISAN: updateISAN
  }
};

const app = express();
const schema = new ApolloServer({
  typeDefs,
  resolvers
});
schema.applyMiddleware({ app, path: '/graphql' });
database.applyMiddleware({ app, path: '/database' });

app.listen(3000, () => {
  console.log('Go to http://localhost:3000/graphql to run queries!');
});