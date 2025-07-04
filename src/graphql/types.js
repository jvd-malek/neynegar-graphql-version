const { gql } = require('graphql-tag');

const types = gql`
  scalar FormData

  type HomePageData {
    caliBooks: [Product]
    paintBooks: [Product]
    gallery: [Product]
    traditionalBooks: [Product]
    articles: [Article]
    discountProducts: [Product]
  }

  type User {
    _id: ID!
    status: String!
    name: String!
    phone: String!
    discount: [Discount]
    bascket: [BasketItem]
    favorite: [FavoriteItem]
    readingList: [ReadingListItem]
    address: String
    postCode: Float
    totalBuy: Float!
    totalPrice: Float
    totalDiscount: Float
    totalWeight: Float
    createdAt: String
    updatedAt: String
  }

  type PaginatedUsers {
    users: [User!]!
    totalPages: Int!
    currentPage: Int!
    total: Int!
  }

  type PaginatedOrders {
    orders: [Order!]!
    totalPages: Int!
    currentPage: Int!
    total: Int!
  }

  type Discount {
    code: String
    date: Float
    discount: Int
  }

  type BasketItem {
    productId: Product
    count: Int!
  }

  type FavoriteItem {
    productId: Product
  }

  type ReadingListItem {
    articleId: Article
  }

  type EnrichedBasket {
    count: Int!
    productId: BasketProduct!
    currentPrice: Float!
    currentDiscount: Float!
    itemTotal: Float!
    itemDiscount: Float!
    itemWeight: Float!
  }

  type UserFullBasket {
    user: User!
    basket: [EnrichedBasket]!
    subtotal: Float!
    totalDiscount: Float!
    total: Float!
    totalWeight: Float!
    shippingCost: Float!
    grandTotal: Float!
    state: Boolean!
  }

  type Product {
    _id: ID!
    title: String!
    desc: String!
    price: [PriceHistory]
    cost: [CostHistory]
    discount: [DiscountHistory]
    count: Int!
    showCount: Int!
    totalSell: Int
    popularity: Int!
    authorId: Author
    authorArticleId: Article
    publisherArticleId: Article
    productArticleId: Article
    publisher: String
    publishDate: String
    brand: String
    status: String!
    size: String
    weight: Float!
    majorCat: String!
    minorCat: String!
    cover: String!
    images: [String]
    comments: [Comment]
    createdAt: String
    updatedAt: String
  }

  type BasketProduct {
    _id: ID!
    title: String!
    desc: String!
    price: Float!
    cost: [CostHistory]
    discount: Float!
    count: Int!
    showCount: Int!
    discountRaw: [Discount]!
    totalSell: Int!
    popularity: Int!
    authorId: Author
    authorArticleId: Article
    publisherArticleId: Article
    productArticleId: Article
    publisher: String
    publishDate: String
    brand: String
    status: String!
    size: String
    weight: Float!
    majorCat: String!
    minorCat: String!
    cover: String!
    images: [String]
    comments: [Comment]
    createdAt: String
    updatedAt: String
  }

  type PaginatedProducts {
    products: [Product!]!
    totalPages: Int!
    currentPage: Int!
    total: Int!
  }

  type PaginatedArticles {
    articles: [Article!]!
    totalPages: Int!
    currentPage: Int!
    total: Int!
  }

  type PriceHistory {
    price: Float!
    date: String!
  }

  type CostHistory {
    cost: Float!
    date: String!
    count: Int!
  }

  type DiscountHistory {
    discount: Int!
    date: Float!
  }

  type Order {
    _id: ID!
    products: [OrderProduct]!
    submition: String!
    totalPrice: Float!
    totalWeight: Float
    shippingCost: Float
    discount: Float
    status: String!
    paymentId: String
    authority: String
    postVerify: String
    userId: User!
    createdAt: String
    updatedAt: String
  }

  type OrderProduct {
    productId: Product!
    price: Float
    discount: Float
    count: Int
  }

  type Checkout {
    _id: ID!
    products: [CheckoutProduct]!
    submition: String!
    authority: String!
    totalPrice: Float!
    totalWeight: Float!
    discount: Float
    userId: User!
    expiredAt: String!
    createdAt: String
    updatedAt: String
  }

  type CheckoutProduct {
    productId: Product!
    count: Int!
  }

  type Comment {
    _id: ID!
    txt: String!
    status: String!
    star: Int!
    like: Int!
    productId: Product
    articleId: Article
    userId: User!
    replies: [Reply]
    createdAt: String
    updatedAt: String
  }

  type PaginatedComments {
    comments: [Comment!]!
    totalPages: Int!
    currentPage: Int!
    total: Int!
  }

  type Reply {
    txt: String!
    userId: User!
    like: Int!
  }

  type Article {
    _id: ID!
    authorId: Author!
    title: String!
    minorCat: String!
    majorCat: String!
    desc: String!
    content: [String]!
    subtitles: [String]!
    views: Int!
    cover: String!
    images: [String]
    popularity: Int!
    comments: [Comment]
    createdAt: String
    updatedAt: String
  }

  type Author {
    _id: ID!
    firstname: String!
    lastname: String!
    fullName: String
    articles: [Article]
    createdAt: String
    updatedAt: String
  }

  type Code {
    _id: ID!
    code: String!
    exTime: Int!
    phone: String!
    count: Int!
    createdAt: String
    updatedAt: String
  }

  type Link {
    _id: ID!
    txt: String!
    path: String!
    sort: [Int]!
    subLinks: [SubLink]
    createdAt: String
    updatedAt: String
  }

  type SubLink {
    link: String!
    path: String!
    brand: [String]
  }

  type Ticket {
    _id: ID!
    userId: User!
    response: String
    status: String!
    title: String!
    txt: String!
    createdAt: String
    updatedAt: String
  }

  type PaginatedTickets {
    tickets: [Ticket!]!
    totalPages: Int!
    currentPage: Int!
    total: Int!
  }

  # Input Types
  input ProductImageInput {
    cover: String
    images: [String]
  }

  input ArticleImageInput {
    cover: String
    images: [String]
  }

  input UserInput {
    status: String!
    name: String!
    phone: String!
    address: String
    postCode: Float
  }

  input ProductInput {
    title: String!
    desc: String!
    price: priceInput!
    cost: costInput!
    count: Int!
    discount: DiscountInput!
    showCount: Int!
    totalSell: Int
    popularity: Int!
    authorId: ID
    publisher: String
    publishDate: String
    brand: String
    status: String!
    state: String
    size: String
    weight: Float!
    majorCat: String!
    minorCat: String!
    cover: String!
    images: [String]
  }

  input DiscountInput {
    discount: Int!
    date: Float!
  }

  input priceInput {
    price: Float!
    date: String!
  }

  input costInput {
    cost: Float!
    count: Int
    date: String!
  }

  input OrderInput {
    products: [OrderProductInput]!
    submition: String!
    totalPrice: Float!
    discount: Float
    status: String!
    authority: String!
    userId: ID!
  }

  input OrderProductInput {
    productId: ID!
    price: Float!
    discount: Float!
    count: Int!
  }

  input CheckoutInput {
    products: [CheckoutProductInput]!
    submition: String!
    authority: String!
    totalPrice: Float!
    totalWeight: Float!
    discount: Float
    userId: ID!
  }

  input CheckoutProductInput {
    productId: ID!
    count: Int!
  }

  input CommentInput {
    txt: String!
    star: Int!
    productId: ID
    articleId: ID
  }

  input ReplyInput {
    txt: String!
  }

  input ArticleInput {
    authorId: ID!
    title: String!
    minorCat: String!
    majorCat: String!
    desc: String!
    content: [String]!
    subtitles: [String]!
    views: Int
    cover: String!
    images: [String]
    popularity: Int
  }

  input AuthorInput {
    firstname: String!
    lastname: String!
  }

  input CodeInput {
    code: String!
    exTime: Int!
    phone: String!
    count: Int!
  }

  input LinkInput {
    txt: String!
    path: String!
    sort: [Int]!
    subLinks: [SubLinkInput]
  }

  input SubLinkInput {
    link: String!
    path: String!
    brand: [String]
  }

  input TicketInput {
    userId: ID!
    title: String!
    txt: String!
  }
`;

module.exports = types; 