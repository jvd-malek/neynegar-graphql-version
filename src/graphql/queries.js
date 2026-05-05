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
    allProducts(page: Int, limit: Int): PaginatedProducts!
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
    homePageHero: HomePageHero
    homePageBooks: HomePageBooks
    homePageArticles: HomePageArticles
    homePageCourses: HomePageCourses
    suggestedProducts(majorCat: String!, minorCat: String, cat: String): [Product]
    offer(page: Int, limit: Int): PaginatedProducts!
    localBasket(basket: [BasketInput!]!): UserFullBasket

    outOfStockProducts: [Product]

    # Group Discount Queries
    groupDiscounts(majorCat: String, minorCat: String, brand: String): [GroupDiscount]
    activeGroupDiscounts: [GroupDiscount]

    # Order Queries
    orders(page: Int, limit: Int, search: String): PaginatedOrders
    order(id: ID!): Order
    ordersByUser(page: Int, limit: Int): PaginatedOrders
    ordersByStatus(status: [String]!): [Order]
    freeOrders(page: Int, limit: Int, search: String): PaginatedOrders

    # Checkout Queries
    checkouts: [Checkout]
    checkout(id: ID!): Checkout
    checkoutsByUser(userId: ID!): [Checkout]

    # FAQ Template Queries
    faqTemplates(category: String): [FAQTemplate]
    faqTemplate(id: ID!): FAQTemplate
    activeFaqTemplates: [FAQTemplate]

    # Comment Queries
    comments(page: Int, limit: Int): PaginatedComments!
    comment(id: ID!): Comment
    commentsByProduct(productId: ID!, page: Int, limit: Int): PaginatedComments!
    commentsByArticle(articleId: ID!, page: Int, limit: Int): PaginatedComments!
    commentsByPackage(packageId: ID!, page: Int, limit: Int): PaginatedComments!
    commentsById(type: String! ,id: ID!, page: Int, limit: Int): PaginatedComments!
    commentsByUser(page: Int, limit: Int): PaginatedComments!
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

    # Course Queries
    courses(page: Int, limit: Int, search: String): PaginatedCourses!
    course(id: ID!): Course
    coursesByCategory(category: String!): [Course]

    # Link Queries
    links: [Link]
    link(id: ID!): Link
    linkByPath(path: String!): Link

    # Ticket Queries
    tickets(page: Int, limit: Int, search: String): PaginatedTickets
    ticket(id: ID!): Ticket
    ticketsByUser(page: Int, limit: Int): PaginatedTickets
    ticketsByStatus(status: [String]!): [Ticket]

    # ShippingCost Queries
    shippingCosts: [ShippingCost]
    shippingCost(id: ID!): ShippingCost
    shippingCostByType(type: String!): ShippingCost

    # Province Queries
    provinces: [Province]

    # Package Queries
    packages(
      page: Int, 
      limit: Int, 
      category: String,
      state: String, 
      search: String
    ): PaginatedPackages
    package(id: ID!): Package
    packagesByCategory(
      category: String!, 
      limit: Int
    ): [Package]

    # Sales Analytics Queries
    salesAnalytics(year: Int): SalesAnalytics

    # Alert Queries
    alerts(page: Int, limit: Int, source: String): PaginatedAlerts
    alert(id: ID!): Alert
    userAlerts(page: Int, limit: Int): PaginatedAlerts
    unreadAlertCount: Int
  }
`;

module.exports = queries; 