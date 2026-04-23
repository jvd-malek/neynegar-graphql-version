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
    groupDiscounts: [GroupDiscount]
    courses: [Course]
    relatedProducts: [Product]
  }

  type HomePageHero {
    caliBooks: [Product]
    discountProducts: [Product]
    groupDiscounts: [GroupDiscount]
  }

  type HomePageBooks {
    paintBooks: [Product]
    gallery: [Product]
    traditionalBooks: [Product]
    tools: [Product]
  }

  type HomePageArticles {
    articles: [Article]
  }

  type HomePageCourses {
    courses: [Course]
    relatedProducts: [Product]
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
    courseProgress: [CourseProgress]
    alert: [String]
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
    status: String
  }

  type BasketItem {
    target: String
    productId: Product
    packageId: Package
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
    productId: BasketProduct
    packageId: BasketPackage
    currentPrice: Float!
    currentDiscount: Float!
    itemTotal: Float!
    itemDiscount: Float!
    itemWeight: Float!
  }

  type UserFullBasket {
    user: User
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
    _id: ID
    title: String
    desc: String
    price: [PriceHistory]
    cost: [CostHistory]
    discount: [DiscountHistory]
    count: Int
    showCount: Int
    totalSell: Int
    popularity: Int
    authorId: Author
    authorArticleId: Article
    publisherArticleId: Article
    productArticleId: Article
    publisher: String
    publishDate: String
    brand: String
    status: String
    state: String
    size: String
    weight: Float
    majorCat: String
    minorCat: String
    cover: String
    images: [String]
    currentPrice: Float
    currentDiscount: Int
    finalPrice: Float
    comments: [Comment]
    createdAt: String
    updatedAt: String
  }

  type BasketProduct {
    _id: ID!
    title: String!
    price: Float!
    discount: Float!
    showCount: Int!
    state: String!
    weight: Float!
    cover: String!
  }

  type BasketPackage {
    _id: ID!
    title: String!
    price: Float!
    discount: Float!
    showCount: Int!
    state: String!
    weight: Float!
    cover: String!
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
    discountCode: String
    status: String!
    paymentId: String
    authority: String
    postVerify: String
    userId: User!
    isFreeOrder: Boolean
    createdAt: String
    updatedAt: String
  }

  type OrderProduct {
    productId: Product
    packageId: Package
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

  type CheckoutPayment {
    authority: String!
    paymentURL: String!
    success: Boolean!
    message: String
  }

  type CheckoutProduct {
    productId: Product
    packageId: Package
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
    target: CommentsTarget
    userId: User!
    replies: [Reply]
    createdAt: String
    updatedAt: String
  }

  type CommentsTarget {
    type: String!
    refId: ID!
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
    createdAt: String!
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

  type AuthPayload {
    token: String!
    user: User!
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

  type Sections {
    title: String!
    txt: [String!]!
    images: [Int]
  }

  type Course {
    _id: ID!
    title: String!
    desc: String!
    entry: Int!
    views: Int
    cover: String!
    popularity: Int!
    articleId: Article
    sections: [Sections]
    images: [String]
    prerequisites: [Course]
    category: String!
    relatedProducts: [Product]
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

  type CourseProgress {
    courseId: Course!
    progress: Int!
  }

  type ShippingCost {
    _id: ID!
    type: String!
    cost: Float!
    costPerKg: Float!
    createdAt: String
    updatedAt: String
  }

  type Province {
    province: String!
    cities: [String]!
  }

  type PaginatedCourses {
    courses: [Course!]!
    totalPages: Int!
    currentPage: Int!
    total: Int!
  }

  # Input Types
  input ProductImageInput {
    cover: String
    images: [String]
  }

  input PushSubscriptionInput {
    endpoint: String!
    expirationTime: String
    keys: PushSubscriptionKeysInput!
  }

  input PushSubscriptionKeysInput {
    p256dh: String!
    auth: String!
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

  input CourseInput {
    title: String!
    desc: String!
    views: Int
    cover: String
    popularity: Int
    articleId: ID
    sections: [SectionsInput]
    images: [String]
    prerequisites: [ID]
    category: String!
    relatedProducts: [ID]
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
    popularity: Int
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
    authorArticleId: ID
    publisherArticleId: ID
    productArticleId: ID
  }

  input UpdateProductInput {
    title: String
    desc: String
    price: priceInput
    cost: costInput
    count: Int
    discount: DiscountInput
    showCount: Int
    totalSell: Int
    popularity: Int
    authorId: ID
    publisher: String
    publishDate: String
    brand: String
    status: String
    state: String
    size: String
    weight: Float
    majorCat: String
    minorCat: String
    cover: String
    images: [String]
    authorArticleId: ID
    publisherArticleId: ID
    productArticleId: ID
  }

  input DiscountInput {
    discount: Int!
    date: Float!
  }

  input SectionsInput {
    title: String!
    txt: [String!]!
    images: [Int]
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

  # Group Discount Types
  type GroupDiscount {
    _id: ID!
    title: String!
    majorCat: String!
    minorCat: String
    brand: String
    discount: Int!
    startDate: String
    endDate: String
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }

  input GroupDiscountInput {
    title: String!
    majorCat: String!
    minorCat: String
    brand: String
    discount: Int!
    startDate: String
    endDate: String!
    isActive: Boolean
  }

  input OrderInput {
    products: [OrderProductInput]!
    submition: String!
    totalPrice: Float!
    discount: Float
    discountCode: String
    status: String!
    authority: String!
    userId: ID!
    isFreeOrder: Boolean
  }

  input FreeOrderInput {
    products: [OrderProductInput]!
    submition: String!
    totalPrice: Float!
    discount: Float
    discountCode: String
    status: String!
    customerName: String!
    customerPhone: String!
    customerAddress: String
    customerPostCode: Float
  }

  input OrderProductInput {
    productId: ID
    packageId: ID
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
    productId: ID
    packageId: ID
    count: Int!
  }

  input CommentInput {
    txt: String!
    star: Int!
    productId: ID
    articleId: ID
    target: TargetInput
  }

  input TargetInput {
    type: String!
    id: ID
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
    title: String!
    txt: String!
  }

  input BasketInput {
    productId: ID
    packageId: ID
    count: Int!
  }

  input CourseProgressInput {
    courseId: ID!
    progress: Int!
  }

  input ShippingCostInput {
    type: String!
    cost: Float!
    costPerKg: Float!
  }

  # برای ساخت پکیج جدید
  input PackageInput {
    title: String!
    desc: String!
    totalSell: Int!
    discount: DiscountInput
    status: String!
    state: String!
    category: String!
    brand: String!
    cover: String!
    products: [PackageProductInput!]!
  }

  # برای آپدیت پکیج
  input UpdatePackageInput {
    title: String
    desc: String
    totalSell: Int
    popularity: Int
    discount: DiscountInput
    status: String
    state: String
    category: String
    brand: String
    cover: String
    products: [PackageProductInput]
    tags: [String]
  }

  # نوع جدید برای هر آیتم محصول داخل پکیج
  input PackageProductInput {
    product: ID!
    quantity: Int
  }
  
  type TestFilePathsResponse {
    success: Boolean!
    inputPath: String
    actualPath: String
    currentWorkingDir: String
    message: String!
  }

  type TestFileDeletionResponse {
    success: Boolean!
    message: String!
    inputPath: String
    actualPath: String
    deleted: Boolean
  }

  # Sales Analytics Types

  type MonthlyProductStats {
    product: Product
    package: Package
    totalCount: Int
    totalRevenue: Float
    totalSell: Int
  }

  type MonthlySalesData {
    month: String!
    year: Int!
    totalOrders: Int!
    totalRevenue: Float!
    freeOrders: Int!
    paidOrders: Int!
    freeOrderRevenue: Float!
    paidOrderRevenue: Float!
    products: [MonthlyProductStats!]!
  }

  type SalesAnalytics {
    monthlyData: [MonthlySalesData!]!
    totalRevenue: Float!
    totalOrders: Int!
    averageOrderValue: Float!
    freeOrderPercentage: Float!
    topProducts: [MonthlyProductStats!]!
  }

  # Package Types

  type Package {
    _id: ID
    title: String
    desc: String
    showCount: Int
    totalSell: Int
    popularity: Int
    discount: [DiscountHistory]
    status: String
    state: String
    category: String
    brand: String
    cover: String
    products: [PackageProduct!]
    totalPrice: Float
    totalWeight: Float
    finalPrice: Float
    totalProducts: Int
    currentDiscount: Int
    createdAt: String
    updatedAt: String
  }

  # محصول داخل پکیج
  type PackageProduct {
    product: Product
    quantity: Int!
  }

  # برای صفحه‌بندی
  type PaginatedPackages {
    packages: [Package!]!
    totalPages: Int!
    currentPage: Int!
    total: Int!
  }
`;

module.exports = types; 