import { FormikProps } from 'formik';

export const getFieldError = <T,>(
  fieldName: keyof T | string,
  formik: FormikProps<T>
): string | undefined => {
  const field = String(fieldName);
  const touched = formik.touched[fieldName as keyof T];
  const error = formik.errors[fieldName as keyof T];
  
  return touched && error ? String(error) : undefined;
};

export const hasFieldError = <T,>(
  fieldName: keyof T | string,
  formik: FormikProps<T>
): boolean => {
  return !!getFieldError(fieldName, formik);
};
