const { gql } = require('apollo-server-express');
const { print } = require('graphql');
require('isomorphic-fetch');

const query = print(
  gql`
    fragment BookFragment on Book {
      ISBN
      title
    }
    fragment AuthorFragment on Author {
      name
    }
    fragment MovieFragment on Movie {
      ISAN
      title
    }
    fragment DirectorFragment on Director {
      name
    }
    mutation SeedDatabase {
      u1: CreateUser(
        username: "Guest"
      ) {
        username
      }
      b1: CreateBook(
        ISBN: 1,
        title: "Harry Potter and the Sorcerer's Stone"
      ) {
        ...BookFragment
      }
      b2: CreateBook(
        ISBN: 2,
        title: "Jurassic Park"
      ) {
        ...BookFragment
      }
      b3: CreateBook(
        ISBN: 3,
        title: "Eragon"
      ) {
        ...BookFragment
      }
      b4: CreateBook(
        ISBN: 4,
        title: "The Hound of the Baskervilles"
      ) {
        ...BookFragment
      }
      b5: CreateBook(
        ISBN: 5,
        title: "Harry Potter and the Chamber of Secrets"
      ) {
        ...BookFragment
      }
      a1: CreateAuthor(
        name: "J.K. Rowling"
      ) {
        ...AuthorFragment
      }
      a2: CreateAuthor(
        name: "Michael Crichton"
      ) {
        ...AuthorFragment
      }
      a3: CreateAuthor(
        name: "Christopher Paolini"
      ) {
        ...AuthorFragment
      }
      a4: CreateAuthor(
        name: "Arthur Conan Doyle"
      ) {
        ...AuthorFragment
      }
      m1: CreateMovie(
        ISAN: 1,
        title: "Detective Pikachu"
      ) {
        ...MovieFragment
      }
      d1: CreateDirector(
        name: "Rob Letterman"
      ) {
        ...DirectorFragment
      }
      br1: RelateAuthorToBook(
        authorName: "J.K. Rowling",
        bookISBN: 1,
        year: 1997
      )
      br2: RelateAuthorToBook(
        authorName: "Michael Crichton",
        bookISBN: 2,
        year: 1990
      )
      br3: RelateAuthorToBook(
        authorName: "Christopher Paolini",
        bookISBN: 3,
        year: 2002
      )
      br4: RelateAuthorToBook(
        authorName: "Arthur Conan Doyle",
        bookISBN: 4,
        year: 1902
      )
      br5: RelateAuthorToBook(
        authorName: "J.K. Rowling"
        bookISBN: 5,
        year: 1998
      )
      mr1: RelateDirectorToMovie(
        directorName: "Rob Letterman",
        movieISAN: 1
      )
    }
  `
);

fetch('http://localhost:3000/database', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
});