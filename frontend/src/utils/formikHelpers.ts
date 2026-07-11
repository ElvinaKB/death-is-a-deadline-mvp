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

export const getFieldErrorId = (fieldName: string): string =>
  `${fieldName}-error`;

/** Links inputs to error messages for screen readers (WCAG 3.3.1). */
export const getFieldDescribedBy = <T,>(
  fieldName: keyof T | string,
  formik: FormikProps<T>,
  extraIds?: string
): string | undefined => {
  const ids = [
    extraIds,
    getFieldError(fieldName, formik)
      ? getFieldErrorId(String(fieldName))
      : undefined,
  ].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
};
