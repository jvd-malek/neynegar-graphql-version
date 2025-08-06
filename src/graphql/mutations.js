const { gql } = require('graphql-tag');

const mutations = gql`
  type Mutation {
    # User Mutations
    createUser(input: UserInput!): User
    updateUser(id: ID!, input: UserInput!): User
    deleteUser(id: ID!): Boolean
    addToBasket(productId: ID!, count: Int!): User
    removeFromBasket(productId: ID!): User
    addToFavorite(productId: ID!): User
    removeFromFavorite(userId: ID!, productId: ID!): User
    addToReadingList(userId: ID!, articleId: ID!): User
    removeFromReadingList(userId: ID!, articleId: ID!): User
    updateUserAddress(userId: ID!, address: String!, postCode: Int!): User
    addDiscount(userId: ID!, code: String!, discount: Int!, date: Float!): User
    removeDiscount(userId: ID!, code: String!): User
    updateBasketCount(userId: ID!, productId: ID!, count: Int!): User
    updateCourseProgress( courseId: ID!, progress: Int!): User
    sendVerificationCode(phone: String!, name: String!): Boolean
    verifyCode(phone: String!, code: String!, name: String!, basket: [BasketInput]): AuthPayload
    updateUserStatus(status: String!): User

    # Product Mutations
    createProduct(input: ProductInput!): Product
    updateProduct(id: ID!, input: UpdateProductInput!): Product
    updateProductImages(id: ID!, input: ProductImageInput!): Product
    deleteProduct(id: ID!): Boolean
    updateProductPrice(id: ID!, price: Float!): Product
    updateProductCost(id: ID!, cost: Float!, count: Int!): Product
    updateProductDiscount(id: ID!, discount: Int!): Product
    updateProductStatus(id: ID!, status: String!): Product

    # Order Mutations
    createOrder(input: OrderInput!): Order
    updateOrder(id: ID!, input: OrderInput!): Order
    deleteOrder(id: ID!): Boolean
    updateOrderStatus(id: ID!, status: String!): Order
    updateOrderPayment(id: ID!, paymentId: String!): Order
    updateOrderPostVerify(id: ID!, postVerify: String!): Order
    verifyOrderPayment(orderId: ID!): Order

    # Checkout Mutations
    createCheckout(input: CheckoutInput!): Checkout
    updateCheckout(id: ID!, input: CheckoutInput!): Checkout
    deleteCheckout(id: ID!): Boolean
    convertCheckoutToOrder(checkoutId: ID!): Order
    createCheckoutPayment(shipment: String!, discount: Float!): CheckoutPayment

    # Comment Mutations
    createComment(input: CommentInput!): Comment
    updateComment(id: ID!, input: CommentInput!): Comment
    deleteComment(id: ID!): Boolean
    addReply(commentId: ID!, input: ReplyInput!): Comment
    updateCommentStatus(id: ID!, status: String!): Comment
    likeComment(id: ID!): Comment
    likeReply(commentId: ID!, replyIndex: Int!): Comment

    # Article Mutations
    createArticle(input: ArticleInput!): Article
    updateArticle(id: ID!, input: ArticleInput!): Article
    deleteArticle(id: ID!): Boolean
    updateArticlePopularity(id: ID!, popularity: Int!): Article
    incrementArticleViews(id: ID!): Article
    updateArticleImages(id: ID!, input: ArticleImageInput!): Article

    # Author Mutations
    createAuthor(input: AuthorInput!): Author
    updateAuthor(id: ID!, input: AuthorInput!): Author
    deleteAuthor(id: ID!): Boolean

    # Course Mutations
    createCourse(input: CourseInput!): Course
    updateCourse(id: ID!, input: CourseInput!): Course
    deleteCourse(id: ID!): Boolean
    addSectionToCourse(courseId: ID!, section: SectionsInput!): Course
    updateCourseViews(courseId: ID!, views: Int!): Course

    # Link Mutations
    createLink(input: LinkInput!): Link
    updateLink(id: ID!, input: LinkInput!): Link
    deleteLink(id: ID!): Boolean
    updateLinkSort(id: ID!, sort: [Int]!): Link

    # Group Discount Mutations
    createGroupDiscount(input: GroupDiscountInput!): GroupDiscount
    updateGroupDiscount(id: ID!, input: GroupDiscountInput!): GroupDiscount
    deleteGroupDiscount(id: ID!): Boolean

    # Ticket Mutations
    createTicket(input: TicketInput!): Ticket
    updateTicket(id: ID!, input: TicketInput!): Ticket
    deleteTicket(id: ID!): Boolean
    updateTicketStatus(id: ID!, status: String!): Ticket
    addTicketResponse(id: ID!, response: String!): Ticket

    # ShippingCost Mutations
    createShippingCost(input: ShippingCostInput!): ShippingCost
    updateShippingCost(id: ID!, input: ShippingCostInput!): ShippingCost
    deleteShippingCost(id: ID!): Boolean
  }
`;

module.exports = mutations; 