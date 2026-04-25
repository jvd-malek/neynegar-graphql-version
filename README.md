# 🎯 NeyNegar GraphQL Backend

This repository contains the backend implementation of the **NeyNegar** project — an online shop and educational platform for Persian calligraphy. It is fully powered by **GraphQL** and built with **Node.js**, focusing on scalability, modularity, and performance.

---

## 🚀 Key Features

- Full GraphQL API using **Apollo Server**
- JWT-based authentication and role-based access control
- SMS verification via **Faraaz SMS**
- File upload support using **Multer**
- Online payment integration with **Zarinpal**
- Persian date support via **jalali-moment**
- Cart system and group discount logic
- Clean and maintainable codebase with modular folder structure

---

## 🧱 Tech Stack

- [**Node.js**](https://nodejs.org/)
- [**Express.js** (v5)](https://expressjs.com/)
- [**Apollo Server**](https://www.apollographql.com/docs/apollo-server/)
- [**MongoDB**](https://www.mongodb.com/) & [**Mongoose**](https://mongoosejs.com/)
- [**GraphQL**](https://graphql.org/)
- [**JWT** (`jsonwebtoken`)](https://github.com/auth0/node-jsonwebtoken)
- [**Multer**](https://github.com/expressjs/multer)
- [**dotenv**](https://github.com/motdotla/dotenv)
- [**bcryptjs**](https://github.com/dcodeIO/bcrypt.js)
- [**jalali-moment**](https://github.com/jalaali/jalali-moment)
- [**cors**](https://github.com/expressjs/cors)

---

## 🧾 Project Structure

```
├── package.json
├── src
│   ├── graphql
│   │   ├── mutations.js
│   │   ├── queries.js
│   │   ├── schema.js
│   │   └── types.js
│   ├── middleware
│   │   ├── auth.js
│   │   ├── uploader.js
│   │   ├── userStatus.js
│   │   └── zarinpal.js
│   ├── models
│   │   ├── Article.js
│   │   ├── Author.js
│   │   ├── Checkout.js
│   │   ├── Code.js
│   │   ├── Comment.js
│   │   ├── Course.js
│   │   ├── GroupDiscount.js
│   │   ├── Link.js
│   │   ├── Order.js
│   │   ├── Product.js
│   │   ├── Province.js
│   │   ├── ShippingCost.js
│   │   ├── Ticket.js
│   │   └── User.js
│   ├── utils
│   │   ├── fileUpload.js
│   │   └── getUserFromToken.js
│   └── index.js
```

<<<<<<< HEAD
2. Create a `.env` file in the backend directory with at least:
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/neynegar
JWT_KEY=your_jwt_secret

# Optional SMS configs (will fallback to code defaults if unset)
SMS_USERNAME=your_ippanel_username
SMS_PASSWORD=your_ippanel_password
SMS_FROM=3000505
SMS_PROMO_PATTERN=ispyrv56rhgo2yb

# Promo defaults
PROMO_DISCOUNT_PERCENT=10
PROMO_VALID_DAYS=7
```
=======
>>>>>>> d323a4b0a57ebb16278bb5e410f7a611c563df26

## 📬 Contact

For feedback, suggestions or questions, feel free to contact me at:

- 📧 Email: [jvd.malek0079@gmail.com](mailto:jvd.malek0079@gmail.com)
- 🔗 [LinkedIn](https://www.linkedin.com/in/javad-malekian)  
- 💻 [Front-end Repository](https://github.com/jvd-malek/neynegar-next-version)
  
Visit [neynegar1.ir](https://neynegar1.ir) for more information or to get in touch.

---

<<<<<<< HEAD
GraphQL playground (local dev): http://localhost:4000/graphql

## Daily Promo Scheduler

The server runs a daily job that:

- Finds users with non-empty `bascket` whose `updatedAt` is older than 2 days
- Ensures no promo was sent to them in the last 10 days (via `lastPromoSentAt` on `User`)
- Generates a discount code, stores it in `user.discount`, updates `lastPromoSentAt`, and sends an SMS via ippanel

Configuration via `.env`:

- `PROMO_DISCOUNT_PERCENT` (default 10)
- `PROMO_VALID_DAYS` (default 7)
- `SMS_USERNAME`, `SMS_PASSWORD`, `SMS_FROM`, `SMS_PROMO_PATTERN`

The scheduler starts automatically when the server starts and runs once ~10 seconds after boot, then every 24 hours.
=======
## ⭐ Contributions

If you’d like to contribute, feel free to fork the repo and submit a pull request.  
All kinds of suggestions are welcome!

---

## 📄 License

MIT © 2025 | Developed by [Javad Malek](mailto:jvd.malek0079@gmail.com)

## 📁 Project Structure

>>>>>>> d323a4b0a57ebb16278bb5e410f7a611c563df26
