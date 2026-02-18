export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'OM ABHUSHAN JWELLARIES  Backend API',
    version: '1.0.0',
    description: 'API for products, categories, subcategories, uploads, mail, and admin auth'
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local' }
  ],
  tags: [
    { name: 'Health' },
    { name: 'Files' },
    { name: 'Mail' },
    { name: 'Products' },
    { name: 'Categories' },
    { name: 'Subcategories' },
    { name: 'Admin' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { ok: { type: 'boolean' }, message: { type: 'string' } }
      },
      Pagination: {
        type: 'object',
        properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } }
      },
      Price: {
        type: 'object',
        properties: { currency: { type: 'string', default: 'INR' }, amount: { type: 'number', minimum: 0 } },
        required: ['amount']
      },
      PriceInput: {
        oneOf: [{ type: 'number', minimum: 0 }, { $ref: '#/components/schemas/Price' }]
      },
      ProductVariant: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          sku: { type: 'string' },
          image: { type: 'string' },
          images: { type: 'array', items: { type: 'string' } },
          video: { type: 'string' },
          makingCost: { $ref: '#/components/schemas/Price' },
          otherCharges: { $ref: '#/components/schemas/Price' },
          stock: { type: 'integer', minimum: 0 },
          isActive: { type: 'boolean' },
          attributes: { type: 'object' }
        }
      },
      ProductVariantInput: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          sku: { type: 'string' },
          image: { type: 'string' },
          images: { type: 'array', items: { type: 'string' } },
          video: { type: 'string' },
          makingCost: { $ref: '#/components/schemas/PriceInput' },
          otherCharges: { $ref: '#/components/schemas/PriceInput' },
          stock: { type: 'integer', minimum: 0 },
          isActive: { type: 'boolean' },
          attributes: { type: 'object' }
        }
      },
      Address: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          line1: { type: 'string' },
          line2: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string', default: 'IN' }
        }
      },
      Category: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          isActive: { type: 'boolean' }
        },
        required: ['name', 'slug']
      },
      SubCategory: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          isActive: { type: 'boolean' },
          category: { type: 'string' }
        },
        required: ['name', 'slug', 'category']
      },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariant' }, minItems: 1 },
          category: { type: 'string' },
          subCategory: { type: 'string' },
          isActive: { type: 'boolean' },
          attributes: { type: 'object' }
        },
        required: ['name', 'variants']
      },
      PromoCode: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          code: { type: 'string' },
          description: { type: 'string' },
          discountType: { type: 'string', enum: ['percent', 'fixed'] },
          amount: { type: 'number' },
          maxDiscount: { type: 'number' },
          minOrderValue: { type: 'number' },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          usageLimit: { type: 'integer' },
          usedCount: { type: 'integer' },
          isActive: { type: 'boolean' }
        }
      },
      Payment: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          order: { type: 'string' },
          provider: { type: 'string' },
          method: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          status: { type: 'string' },
          transactionId: { type: 'string' },
          meta: { type: 'object' }
        }
      },
      OrderItem: {
        type: 'object',
        properties: {
          product: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          quantity: { type: 'integer' },
          image: { type: 'string' }
        }
      },
      Order: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          subtotal: { type: 'number' },
          discount: { type: 'number' },
          total: { type: 'number' },
          status: { type: 'string' },
          promocode: { type: 'string' },
          payment: { type: 'string' },
          customerEmail: { type: 'string' },
          customerPhone: { type: 'string' },
          shippingAddress: { $ref: '#/components/schemas/Address' },
          notes: { type: 'string' }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        responses: {
          200: { description: 'OK' }
        }
      }
    },
    '/api/files/image': {
      post: {
        tags: ['Files'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  image: { type: 'string', format: 'binary' }
                },
                required: ['image']
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Created',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, path: { type: 'string' } } } } }
          },
          400: { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/files/images': {
      post: {
        tags: ['Files'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' }
                  }
                },
                required: ['images']
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Created',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, paths: { type: 'array', items: { type: 'string' } } } } } }
          },
          400: { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/files/video': {
      post: {
        tags: ['Files'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  video: { type: 'string', format: 'binary' }
                },
                required: ['video']
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Created',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, path: { type: 'string' } } } } }
          },
          400: { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/mail/send': {
      post: {
        tags: ['Mail'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, text: { type: 'string' }, html: { type: 'string' } }, required: ['subject'] } } }
        },
        responses: {
          200: { description: 'Mail queued', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, id: { type: 'string' } } } } } },
          400: { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/mail/contact': {
      post: {
        tags: ['Mail'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, message: { type: 'string' } }, required: ['name', 'email', 'message'] } } }
        },
        responses: {
          200: { description: 'Mail queued', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, id: { type: 'string' } } } } } },
          400: { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'q', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Product' } }, page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } } } } } },
          503: { description: 'DB not connected', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        tags: ['Products'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  categoryId: { type: 'string' },
                  subCategoryId: { type: 'string' },
                  attributes: { type: 'object' },
                  isActive: { type: 'boolean' },
                  variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariantInput' }, minItems: 1 },
                },
                required: ['name', 'variants']
              }
            }
          }
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { $ref: '#/components/schemas/Product' } } } } } },
          400: { description: 'Invalid input', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Related not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          503: { description: 'DB not connected', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/products/{id}': {
      get: {
        tags: ['Products'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Item', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { $ref: '#/components/schemas/Product' } } } } } },
          400: { description: 'Invalid id', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        tags: ['Products'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  categoryId: { type: 'string' },
                  subCategoryId: { type: 'string' },
                  attributes: { type: 'object' },
                  isActive: { type: 'boolean' },
                  variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariantInput' }, minItems: 1 },
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Updated', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { $ref: '#/components/schemas/Product' } } } } } },
          400: { description: 'Invalid input', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        tags: ['Products'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Deleted' },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/categories': {
      get: {
        tags: ['Categories'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'isActive', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } }
        ],
        responses: {
          200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Category' } }, page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } } } } } }
        }
      },
      post: {
        tags: ['Categories'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, isActive: { type: 'boolean' } }, required: ['name'] } } }
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { $ref: '#/components/schemas/Category' } } } } } },
          409: { description: 'Conflict', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/categories/{id}': {
      get: {
        tags: ['Categories'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Item', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { $ref: '#/components/schemas/Category' } } } } } },
          400: { description: 'Invalid id', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        tags: ['Categories'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          200: { description: 'Updated', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { $ref: '#/components/schemas/Category' } } } } } },
          409: { description: 'Conflict', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        tags: ['Categories'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Deleted' },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/subcategories': {
      get: {
        tags: ['Subcategories'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'isActive', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          { name: 'categoryId', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/SubCategory' } }, page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } } } } } }
        }
      },
      post: {
        tags: ['Subcategories'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, isActive: { type: 'boolean' }, categoryId: { type: 'string' } }, required: ['name', 'categoryId'] } } }
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { $ref: '#/components/schemas/SubCategory' } } } } } },
          404: { description: 'Category not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Conflict', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/subcategories/{id}': {
      get: {
        tags: ['Subcategories'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Item', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { $ref: '#/components/schemas/SubCategory' } } } } } },
          400: { description: 'Invalid id', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        tags: ['Subcategories'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          200: { description: 'Updated', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { $ref: '#/components/schemas/SubCategory' } } } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Conflict', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        tags: ['Subcategories'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Deleted' },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/admin/login/init': {
      post: {
        tags: ['Admin'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] } } } },
        responses: {
          200: { description: 'OTP sent', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, message: { type: 'string' } } } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/admin/login/verify': {
      post: {
        tags: ['Admin'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, otp: { type: 'string' } }, required: ['email', 'otp'] } } } },
        responses: {
          200: { description: 'Token issued', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, token: { type: 'string' } } } } } },
          400: { description: 'Invalid OTP', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Too many attempts', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/admin/me': {
      get: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current admin', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { type: 'object', properties: { email: { type: 'string' } } } } } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    }
  }
}
