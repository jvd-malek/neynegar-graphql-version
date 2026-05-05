const { gql } = require('graphql-tag');

const mutations = gql`
  type Mutation {
    # User Mutations
    createUser(input: UserInput!): User
    updateUser(id: ID!, input: UserInput!): User
    deleteUser(id: ID!): Boolean
    pushProductToBasket(productId: ID!, count: Int!): User
    pushPackageToBasket(packageId: ID!, count: Int!): User
    pullProductFromBasket(productId: ID!, count: Int!): User
    pullPackageFromBasket(packageId: ID!, count: Int!): User
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

    # Push Notification Mutations
    savePushSubscription(subscription: PushSubscriptionInput!): User
    sendPushNotification(userId: ID!, title: String!, body: String!): Boolean

    # Product Mutations
    createProduct(input: ProductInput!): Product
    updateProduct(id: ID!, input: UpdateProductInput!): Product
    updateProductImages(id: ID!, input: ProductImageInput!): Product
    deleteProduct(id: ID!): Boolean
    updateProductPrice(id: ID!, price: Float!): Product
    updateProductCost(id: ID!, cost: Float!, count: Int!): Product
    updateProductDiscount(id: ID!, discount: Int!): Product
    updateProductStatus(id: ID!, status: String!): Product
    updateProductFaqTemplates(id: ID!, faqTemplateIds: [ID]!): Product
    addFaqTemplateToProduct(productId: ID!, templateId: ID!): Product
    removeFaqTemplateFromProduct(productId: ID!, templateId: ID!): Product
    updateProductFeatures(id: ID!, input: UpdateProductFeaturesInput!): Product
    addSingleFeature(id: ID!, input: FeatureInput!): Product

    # Order Mutations
    createOrder(input: OrderInput!): Order
    updateOrder(id: ID!, input: OrderInput!): Order
    deleteOrder(id: ID!): Boolean
    updateOrderStatus(id: ID!, status: String!): Order
    updateOrderPayment(id: ID!, paymentId: String!): Order
    updateOrderPostVerify(id: ID!, postVerify: String!): Order
    verifyOrderPayment(orderId: ID!): Order
    createFreeOrder(input: FreeOrderInput!): Order

    # Checkout Mutations
    createCheckout(input: CheckoutInput!): Checkout
    updateCheckout(id: ID!, input: CheckoutInput!): Checkout
    deleteCheckout(id: ID!): Boolean
    convertCheckoutToOrder(checkoutId: ID!): Order
    createCheckoutPayment(shipment: String!, discountCode: String): CheckoutPayment

    # Comment Mutations
    createComment(input: CommentInput!): Comment
    updateComment(id: ID!, input: CommentInput!): Comment
    deleteComment(id: ID!): Boolean
    addReply(commentId: ID!, input: ReplyInput!): Comment
    updateCommentStatus(id: ID!, status: String!): Comment
    likeComment(id: ID!): Comment
    likeReply(commentId: ID!, replyIndex: Int!): Comment

    # FAQ Template Mutations
    createFAQTemplate(input: FAQTemplateInput!): FAQTemplate
    updateFAQTemplate(id: ID!, input: UpdateFAQTemplateInput!): FAQTemplate
    deleteFAQTemplate(id: ID!): Boolean
    addFAQToTemplate(id: ID!, question: String!, answer: String!): FAQTemplate
    removeFAQFromTemplate(id: ID!, questionIndex: Int!): FAQTemplate

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
    updateCourseEntry(courseId: ID!, entry: Int!): Course

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

    # Package Mutations
    createPackage(input: PackageInput!): Package!
    updatePackage(id: ID!, input: UpdatePackageInput!): Package!
    deletePackage(id: ID!): Boolean!
    addProductToPackage(packageId: ID!, input: PackageProductInput!): Package!
    removeProductFromPackage(packageId: ID!, productId: ID!): Package!

    # Alert Mutations
    createAlert(input: AlertInput!): Alert
    deleteAlert(id: ID!): Boolean
    markAlertAsRead(alertId: ID!): Alert
    markAllAlertsAsRead: Boolean
  }
`;

module.exports = mutations; 