# Student Bidding Platform - Authentication Module

This is the frontend for the Student Bidding Platform's authentication system. Built with React, TypeScript, Redux Toolkit, React Query, and Shadcn UI.

## Features

### Current Implementation (Phase 1)
- ✅ Complete authentication flow with login and signup
- ✅ Academic email validation (.edu domains)
- ✅ Student ID card upload for non-academic emails
- ✅ Role-based routing (Student, Hotel Owner, Admin)
- ✅ Redux state management with persistence
- ✅ React Query for API calls with reusable hooks
- ✅ Protected routes
- ✅ Admin panel with sidebar navigation
- ✅ Student management (list, detail, approve/reject)
- ✅ Reusable components (Table, Skeleton, Alerts)
- ✅ Form validation with Formik & Yup
- ✅ Toast notifications
- ✅ SweetAlert confirmations
- ✅ TypeScript throughout
- ✅ Proper folder structure by modules

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Redux Toolkit** with Redux Persist
- **React Query (TanStack Query)** for API state
- **React Router v6** for routing
- **Formik & Yup** for forms and validation
- **Shadcn UI** + Tailwind CSS for styling
- **Lucide Icons**
- **js-cookie** for token management
- **SweetAlert2** for confirmations
- **Sonner** for toast notifications

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── auth/
│   │   │   └── ProtectedRoute.tsx
│   │   ├── common/
│   │   │   ├── DataTable.tsx
│   │   │   ├── PendingApprovalAlert.tsx
│   │   │   └── SkeletonLoader.tsx
│   │   └── ui/                 # Shadcn components
│   ├── layouts/
│   │   └── AdminLayout.tsx
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminDashboardPage.tsx
│   │   │   ├── StudentsListPage.tsx
│   │   │   └── StudentDetailPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── StudentMarketplacePage.tsx
│   │   ├── HotelDashboardPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── UnauthorizedPage.tsx
│   └── App.tsx
├── config/
│   ├── routes.config.ts
│   ├── endpoints.config.ts
│   └── queryKeys.config.ts
├── hooks/
│   ├── useApi.ts
│   └── useAdminSidebar.tsx
├── lib/
│   └── apiClient.ts
├── store/
│   ├── slices/
│   │   └── authSlice.ts
│   ├── hooks.ts
│   └── index.ts
├── types/
│   ├── api.types.ts
│   ├── auth.types.ts
│   └── student.types.ts
└── utils/
    ├── emailValidator.ts
    ├── formikHelpers.ts
    ├── tokenHelpers.ts
    └── validationSchemas.ts
```

## Backend Requirements

### API Endpoints Needed

#### Authentication
```
POST /api/auth/signup
- Body: { name, email, password, confirmPassword, studentIdCard? (file) }
- Returns: { user, token }

POST /api/auth/login
- Body: { email, password }
- Returns: { user, token }
```

#### Students (Admin Only)
```
GET /api/students?page=1&limit=10&status=PENDING
- Returns: { students[], total, page, limit }

GET /api/students/:id
- Returns: { student }

GET /api/students/stats
- Returns: { totalStudents, approvedStudents, pendingStudents }

POST /api/students/:id/approve
- Returns: success message

POST /api/students/:id/reject
- Body: { reason? }
- Returns: success message
```

### User Model
```typescript
{
  id: string;
  name: string;
  email: string;
  password: string; // hashed
  role: 'STUDENT' | 'HOTEL_OWNER' | 'ADMIN';
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  studentIdUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Business Logic

1. **Email Validation**
   - Check if email has academic domain (.edu, .ac.uk, etc.)
   - Verify against database of accredited institutions
   - If academic email → auto-approve
   - If not → require student ID upload → set status to PENDING

2. **Authentication**
   - JWT tokens stored in HTTP-only cookies
   - Return user object with token on successful login
   - Check approval status before allowing login for students

3. **Authorization**
   - Protect admin routes - require ADMIN role
   - Students with PENDING status can login but see approval message
   - Only APPROVED students can access marketplace

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update VITE_API_BASE_URL in .env to point to your backend

# Start development server
npm run dev
```

## Configuration

### Routes (`src/config/routes.config.ts`)
All application routes are centralized here.

### Endpoints (`src/config/endpoints.config.ts`)
All API endpoints are defined here. Use `getEndpoint(endpoint, params)` for dynamic routes.

### Query Keys (`src/config/queryKeys.config.ts`)
React Query keys for cache management.

## Usage Examples

### Using React Query Hooks

```typescript
// GET request
const { data, isLoading } = useApiQuery<ResponseType>({
  queryKey: [QUERY_KEYS.STUDENTS_LIST],
  endpoint: ENDPOINTS.STUDENTS_LIST,
});

// POST request
const mutation = useApiMutation<ResponseType, RequestType>({
  endpoint: ENDPOINTS.LOGIN,
  method: 'POST',
  onSuccess: (data) => {
    // Handle success
  },
});

mutation.mutate(requestData);
```

### Using Formik with Validation

```typescript
const formik = useFormik({
  initialValues: { email: '', password: '' },
  validationSchema: loginSchema,
  onSubmit: (values) => {
    // Handle submit
  },
});

// Get field errors
const error = getFieldError('email', formik);
```

### Protected Routes

```typescript
<ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
  <AdminLayout />
</ProtectedRoute>
```

## Key Features Explained

### 1. Redux with Persistence
- Auth state persists in localStorage
- Token stored separately in cookies for security
- Automatic rehydration on app load

### 2. Reusable React Query Hooks
- `useApiQuery` - for GET requests
- `useApiMutation` - for POST/PUT/PATCH/DELETE
- Default error handling with toast messages
- Centralized API client with auth token injection

### 3. Form Management
- Formik for form state
- Yup for validation schemas
- Helper functions for error display
- File upload support

### 4. Table Component
- Built-in pagination
- Skeleton loading states
- Custom render functions
- Type-safe columns

### 5. Admin Panel
- Sidebar navigation
- Profile dropdown with logout
- Module-based routing
- Responsive design

## API Client

The API client (`src/lib/apiClient.ts`) automatically:
- Injects auth token from cookies
- Handles errors
- Supports FormData uploads
- Types all requests/responses

## Styling

Using Tailwind CSS with Shadcn UI components. Custom theme in `/src/styles/theme.css`.

Color scheme:
- Primary: Blue (#3b82f6)
- Success: Green (#22c55e)
- Warning: Yellow (#eab308)
- Error: Red (#ef4444)

## Notes for Backend Team

1. **Academic Email Verification**
   - Frontend does basic .edu check
   - Backend should verify against comprehensive institution database
   - Consider using services like Clearbit or custom database

2. **File Upload**
   - Student ID cards sent as multipart/form-data
   - Store in cloud storage (AWS S3, Cloudinary, etc.)
   - Return public URL in response

3. **Token Management**
   - Frontend stores in HTTP-only cookies
   - Include in Authorization header: `Bearer <token>`
   - Set expiry (recommended: 7 days)

4. **CORS**
   - Allow credentials
   - Whitelist frontend domain

5. **Error Format**
   ```json
   {
     "success": false,
     "message": "Error message",
     "error": {
       "statusCode": 400,
       "errors": {
         "field": ["error message"]
       }
     }
   }
   ```

## Future Enhancements (Phase 2)

- Email verification
- Password reset
- Profile management
- Marketplace implementation
- Bidding system
- Hotel owner features
- Real-time notifications
- Advanced admin analytics

## License

Proprietary - Student Bidding Platform
