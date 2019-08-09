const { ApolloServer, gql } = require('apollo-server-express');
const express = require('express');
const { print } = require('graphql');
require('isomorphic-fetch');
const { Schemata } = require('ne-schemata');
const { database, sharedTypes } = require('./database.js');

// State
var currentUser = 'Guest';

function fetchQuery(queryObj, queryName) {
  return fetch('http://localhost:3000/database', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryObj)
  })
    .then(res => res.json())
    .then(json => {
      if (!json) {
        throw new Error('GraphQL Error');
      }
      return json.data[queryName];
    })
    .catch(console.log);
}

function getUser(username) {
  const query = print(
    gql`
      query GetUser($username: String) {
        user(username: $username) {
          username
          password
          checkedOut {
            ISBN
            title
          }
        }
      }
    `
  );
  const variables = { username };
  return fetchQuery({ query, variables }, 'user');
}

async function getUserInfo() {
  const user = await getUser(currentUser);
  return {
    username: user.username,
    checkedOut: user.checkedOut
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

async function signUp(obj, { username, password }, context, info) {
  if (currentUser != 'Guest') {
    throw new Error('Error: cannot sign up while signed in');
  }

  const existingUser = await getUser(username);
  if (existingUser) {
    throw new Error('Error: user with that username already exists');
  }

  const query = print(
    gql`
      mutation CreateUser($username: String, $password: String) {
        CreateUser(username: $username, password: $password) {
          username
        }
      }
    `
  );
  const variables = {
    username,
    password: fakeSHA256(username + password)
  };
  const newUser = await fetchQuery({ query, variables }, 'CreateUser');

  return newUser ? 'User successfully signed up' : 'Error: sign-up failed'
}

async function signIn(obj, { username, password }, context, info) {
  if (currentUser != 'Guest') {
    throw new Error('Error: a user is already signed in');
  }

  const user = await getUser(username);
  if (!user || user.password != fakeSHA256(username + password)) {
    throw new Error(
      'Error: no user with that combination of username and password exists'
    );
  }

  currentUser = username;

  return `Welcome, ${username}`;
}

function signOut() {
  if (currentUser == 'Guest') {
    throw new Error('Error: no user currently signed in');
  }

  currentUser = 'Guest';

  return 'User successfully signed out';
}

function getBook(ISBN) {
  const query = print(
    gql`
      query GetBook($ISBN: ID) {
        book(ISBN: $ISBN) {
          ISBN
          title
        }
      }
    `
  );
  const variables = { ISBN };
  return fetchQuery({ query, variables }, 'book');
}

async function checkout(obj, { ISBN }, context, info) {
  if (currentUser == 'Guest') {
    throw new Error('Error: no user currently signed in');
  }

  const book = await getBook(ISBN);
  if (!book) {
    throw new Error(`Error: no book with ISBN ${ISBN} exists`);
  }

  const user = await getUser(currentUser);
  const borrowed = user.checkedOut.find(function(b) {
    return b.ISBN == book.ISBN;
  });
  if (borrowed) {
    throw new Error('Error: you have already checked out that book');
  }

  const query = print(
    gql`
      mutation Checkout($username: String, $ISBN: ID) {
        Checkout(username: $username, ISBN: $ISBN)
      }
    `
  );
  const variables = {
    username: currentUser,
    ISBN
  };
  const success = await fetchQuery({ query, variables }, 'Checkout');

  return success ? `Checked out ${book.title}` : 'Error: failed checkout';
}

async function Return(obj, { ISBN }, context, info) {
  if (currentUser == 'Guest') {
    throw new Error('Error: no user currently signed in');
  }

  const book = await getBook(ISBN);
  if (!book) {
    throw new Error(`Error: no book with ISBN ${ISBN} exists`);
  }

  const user = await getUser(currentUser);
  const borrowed = user.checkedOut.find(function(b) {
    return b.ISBN == book.ISBN;
  });
  if (!borrowed) {
    throw new Error('Error: you have not checked out that book');
  }

  const query = print(
    gql`
      mutation Return($username: String, $ISBN: ID) {
        Return(username: $username, ISBN: $ISBN)
      }
    `
  );
  const variables = {
    username: currentUser,
    ISBN
  };
  const success = await fetchQuery({ query, variables }, 'Return');

  return success ? `Returned ${book.title}` : 'Error: failed return';
}

const localTypes = new Schemata(
  gql`
    type Query {
      user: User
    }
    type Mutation {
      signUp(username: String, password: String): String
      signIn(username: String, password: String): String
      signOut: String
      checkout(ISBN: ID): String
      return(ISBN: ID): String
    }
  `
);

const typeDefs = sharedTypes.mergeSDL(localTypes).typeDefs;

const resolvers = {
  Query: {
    user: getUserInfo
  },
  Mutation: {
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    checkout: checkout,
    return: Return
  }
};

const app = express();
const schema = new ApolloServer({ typeDefs, resolvers });
schema.applyMiddleware({ app, path: '/graphql' });
database.applyMiddleware({ app, path: '/database' });

app.listen(3000, () => {
  console.log('Go to http://localhost:3000/graphql to run queries!');
});