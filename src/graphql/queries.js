const { gql } = require('graphql-tag');

const queries = gql`
  type Query {
    # User Queries
    users(page: Int, limit: Int, search: String): PaginatedUsers
    user: User
    userByPhone(phone: String!): User
    userByToken: User
    userFullBasket: UserFullBasket

    # Product Queries
    products(page: Int, limit: Int, search: String): PaginatedProducts!
    productsByCategory(
      majorCat: String!, 
      minorCat: String, 
      page: Int, 
      limit: Int,
      search: String,
      sort: String,
      cat: String
    ): PaginatedProducts!
    
    searchProducts(
      query: String!, 
      page: Int, 
      limit: Int
    ): PaginatedProducts!

    product(id: ID!): Product
    productsByAuthor(authorId: ID!): [Product]
    productsByStatus(status: String!): [Product]
    homePageData: HomePageData
    suggestedProducts(majorCat: String!, minorCat: String, cat: String): [Product]
    offer: [Product]

    # Order Queries
    orders(page: Int, limit: Int, search: String): PaginatedOrders
    order(id: ID!): Order
    ordersByUser(userId: ID!, page: Int, limit: Int): PaginatedOrders
    ordersByStatus(status: [String]!): [Order]

    # Checkout Queries
    checkouts: [Checkout]
    checkout(id: ID!): Checkout
    checkoutsByUser(userId: ID!): [Checkout]

    # Comment Queries
    comments(page: Int, limit: Int): PaginatedComments!
    comment(id: ID!): Comment
    commentsByProduct(productId: ID!, page: Int, limit: Int): PaginatedComments!
    commentsByArticle(articleId: ID!, page: Int, limit: Int): PaginatedComments!
    commentsByUser(userId: ID!, page: Int, limit: Int): PaginatedComments!
    commentsByStatus(status: String!, page: Int, limit: Int): PaginatedComments!

    # Article Queries
    articles(page: Int, limit: Int, search: String): PaginatedArticles!
    article(id: ID!): Article
    articlesByAuthor(authorId: ID!): [Article]
    articlesByCategory(
      majorCat: String!, 
      minorCat: String, 
      page: Int, 
      limit: Int,
      search: String,
      sort: String,
      cat: String
    ): PaginatedArticles!
    
    searchArticles(
      query: String!, 
      page: Int, 
      limit: Int
    ): PaginatedArticles!

    # Author Queries
    authors: [Author]
    author(id: ID!): Author
    authorByName(firstname: String!, lastname: String!): Author

    # Code Queries
    codes: [Code]
    code(id: ID!): Code
    codeByPhone(phone: String!): Code

    # Link Queries
    links: [Link]
    link(id: ID!): Link
    linkByPath(path: String!): Link

    # Ticket Queries
    tickets(page: Int, limit: Int, search: String): PaginatedTickets
    ticket(id: ID!): Ticket
    ticketsByUser(userId: ID!, page: Int, limit: Int): PaginatedTickets
    ticketsByStatus(status: String!): [Ticket]
  }
`;

module.exports = queries; 