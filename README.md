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


## 📬 Contact

For feedback, suggestions or questions, feel free to contact me at:

- 📧 Email: [jvd.malek0079@gmail.com](mailto:jvd.malek0079@gmail.com)
- 🔗 [LinkedIn](https://www.linkedin.com/in/javad-malekian)  
- 💻 [Front-end Repository](https://github.com/jvd-malek/neynegar-next-version)
  
Visit [neynegar1.ir](https://neynegar1.ir) for more information or to get in touch.

---

## ⭐ Contributions

If you’d like to contribute, feel free to fork the repo and submit a pull request.  
All kinds of suggestions are welcome!

---

## 📄 License

MIT © 2025 | Developed by [Javad Malek](mailto:jvd.malek0079@gmail.com)

## 📁 Project Structure

