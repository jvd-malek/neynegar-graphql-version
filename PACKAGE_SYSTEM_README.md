# Package System Documentation

## Overview
The Package system allows you to create bundles of products with names, descriptions, and categories. Each package can contain multiple products, and the package's price, weight, and images are automatically calculated from the products inside it.

## Models

### Package Model
- **title**: عنوان بسته (required, 3-60 characters)
- **desc**: توضیحات بسته (required, 3-600 characters)
- **count**: تعداد بسته (required, min 0)
- **showCount**: تعداد نمایش (required, min 0)
- **totalSell**: تعداد کل فروش (required, min 0)
- **popularity**: محبوبیت (default 5, min 0)
- **authorArticleId**: شناسه مقاله نویسنده (reference to Article)
- **publisherArticleId**: شناسه مقاله ناشر (reference to Article)
- **productArticleId**: شناسه مقاله محصول (reference to Article)
- **status**: وضعیت کیفیت بسته (نو، درحد‌نو، دسته‌دوم)
- **state**: وضعیت بسته (active, inactive, outOfStock, comingSoon, callForPrice)
- **majorCat**: دسته‌بندی اصلی (required, 3-60 characters)
- **minorCat**: دسته‌بندی فرعی (required, 3-60 characters)
- **cover**: تصویر اصلی (required)
- **Products**: آرایه محصولات (array of Product IDs)
- **isFeatured**: آیا بسته ویژه است (boolean, default false)
- **sortOrder**: ترتیب نمایش (default 0)
- **tags**: تگ‌ها (max 10 tags)

### Calculated Fields (Virtual)
- **price**: مجموع قیمت محصولات داخل بسته
- **discount**: میانگین تخفیف محصولات داخل بسته
- **weight**: مجموع وزن محصولات داخل بسته
- **images**: ترکیب تصاویر کاور و تصاویر محصولات داخل بسته
- **currentPrice**: قیمت فعلی بسته
- **currentDiscount**: تخفیف فعلی بسته
- **finalPrice**: قیمت نهایی پس از اعمال تخفیف
- **discountAmount**: مبلغ تخفیف
- **totalProducts**: تعداد کل محصولات در بسته

### PackageProduct Model
- **packageId**: شناسه بسته (required, reference to Package)
- **productId**: شناسه محصول (required, reference to Product)
- **quantity**: تعداد محصول در بسته (required, min 1)
- **isRequired**: آیا محصول اجباری است (boolean, default true)
- **sortOrder**: ترتیب نمایش محصول در بسته (default 0)
- **notes**: یادداشت (optional, max 200 characters)

## GraphQL Queries

### Get All Packages
```graphql
query GetPackages($page: Int, $limit: Int, $majorCat: String, $minorCat: String, $state: String, $isFeatured: Boolean, $search: String) {
  packages(page: $page, limit: $limit, majorCat: $majorCat, minorCat: $minorCat, state: $state, isFeatured: $isFeatured, search: $search) {
    packages {
      _id
      title
      desc
      count
      showCount
      totalSell
      popularity
      status
      state
      majorCat
      minorCat
      cover
      isFeatured
      sortOrder
      tags
      price {
        price
        date
      }
      discount {
        discount
        date
      }
      currentPrice
      currentDiscount
      finalPrice
      discountAmount
      weight
      images
      totalProducts
      Products {
        _id
        title
        cover
        price {
          price
          date
        }
        discount {
          discount
          date
        }
      }
    }
    totalPages
    currentPage
    total
  }
}
```

### Get Single Package
```graphql
query GetPackage($id: ID!) {
  package(id: $id) {
    _id
    title
    desc
    count
    showCount
    totalSell
    popularity
    status
    state
    majorCat
    minorCat
    cover
    isFeatured
    sortOrder
    tags
    price {
      price
      date
    }
    discount {
      discount
      date
    }
    currentPrice
    currentDiscount
    finalPrice
    discountAmount
    weight
    images
    totalProducts
    Products {
      _id
      title
      desc
      cover
      images
      price {
        price
        date
      }
      discount {
        discount
        date
      }
      majorCat
      minorCat
      status
      state
      weight
    }
  }
}
```

### Get Packages by Category
```graphql
query GetPackagesByCategory($majorCat: String!, $minorCat: String, $limit: Int) {
  packagesByCategory(majorCat: $majorCat, minorCat: $minorCat, limit: $limit) {
    _id
    title
    desc
    majorCat
    minorCat
    cover
    state
    currentPrice
    currentDiscount
    finalPrice
    totalProducts
    isFeatured
  }
}
```

### Get Featured Packages
```graphql
query GetFeaturedPackages($limit: Int) {
  featuredPackages(limit: $limit) {
    _id
    title
    desc
    majorCat
    minorCat
    currentPrice
    currentDiscount
    finalPrice
    cover
    state
    totalProducts
    isFeatured
  }
}
```

## GraphQL Mutations

### Create Package
```graphql
mutation CreatePackage($input: PackageInput!) {
  createPackage(input: $input) {
    _id
    title
    desc
    count
    showCount
    totalSell
    popularity
    status
    state
    majorCat
    minorCat
    cover
    Products
    isFeatured
    sortOrder
    tags
  }
}
```

### Update Package
```graphql
mutation UpdatePackage($id: ID!, $input: UpdatePackageInput!) {
  updatePackage(id: $id, input: $input) {
    _id
    title
    desc
    count
    showCount
    totalSell
    popularity
    status
    state
    majorCat
    minorCat
    cover
    Products
    isFeatured
    sortOrder
    tags
  }
}
```

### Delete Package
```graphql
mutation DeletePackage($id: ID!) {
  deletePackage(id: $id)
}
```

### Add Product to Package
```graphql
mutation AddProductToPackage($input: PackageProductInput!) {
  addProductToPackage(input: $input) {
    _id
    packageId {
      _id
      title
    }
    productId {
      _id
      title
    }
    quantity
    isRequired
    sortOrder
    notes
  }
}
```

### Remove Product from Package
```graphql
mutation RemoveProductFromPackage($packageId: ID!, $productId: ID!) {
  removeProductFromPackage(packageId: $packageId, productId: $productId)
}
```

## Example Usage

### Creating a Book Package
```javascript
// Create a package
const packageInput = {
  title: "بسته کتاب‌های شعر کلاسیک",
  desc: "مجموعه‌ای از بهترین کتاب‌های شعر کلاسیک فارسی شامل آثار حافظ، سعدی، مولوی و فردوسی",
  count: 10,
  showCount: 10,
  totalSell: 0,
  popularity: 85,
  status: "نو",
  state: "active",
  majorCat: "کتاب",
  minorCat: "شعر کلاسیک",
  cover: "https://example.com/classic-poetry-package.jpg",
  Products: [], // Will be populated when adding products
  isFeatured: true,
  sortOrder: 1,
  tags: ["شعر", "کلاسیک", "فارسی", "حافظ", "سعدی"]
};

// Add products to the package
const productInputs = [
  {
    packageId: "package_id_here",
    productId: "hafez_book_id",
    quantity: 1,
    isRequired: true,
    sortOrder: 1,
    notes: "دیوان حافظ با شرح کامل"
  },
  {
    packageId: "package_id_here",
    productId: "saadi_book_id",
    quantity: 1,
    isRequired: true,
    sortOrder: 2,
    notes: "گلستان سعدی"
  },
  {
    packageId: "package_id_here",
    productId: "molavi_book_id",
    quantity: 1,
    isRequired: true,
    sortOrder: 3,
    notes: "مثنوی معنوی"
  }
];
```

## Features

1. **Automatic Price Calculation**: Package price is automatically calculated from the sum of all product prices
2. **Automatic Weight Calculation**: Package weight is automatically calculated from the sum of all product weights
3. **Automatic Image Collection**: Package images are automatically collected from all product covers and images
4. **Automatic Discount Calculation**: Package discount is calculated as the average discount of all products
5. **Flexible Product Management**: Add/remove products from packages with quantities and notes
6. **Category Organization**: Organize packages by main and sub-categories
7. **Featured Packages**: Mark packages as featured for special display
8. **Search & Filter**: Search packages by title, description, or tags
9. **Sorting**: Sort packages by popularity, creation date, or custom order
10. **Status Management**: Control package visibility with state field
11. **Tag System**: Add tags for better categorization and search
12. **Auto-calculation**: Total products count is automatically maintained
13. **Virtual Fields**: All calculated fields are virtual and update automatically
14. **Product Integration**: Seamless integration with existing Product model
15. **GraphQL Support**: Full GraphQL API with queries and mutations

## Permissions

- **Admin/Owner**: Can create, update, delete packages and manage package products
- **Users**: Can view packages and package details
- **Public**: Can view active packages

## Database Indexes

The system includes optimized indexes for:
- Text search on name and description
- Category and sub-category filtering
- Status filtering
- Popularity sorting
- Featured packages
- Sort order
- Package-product relationships
