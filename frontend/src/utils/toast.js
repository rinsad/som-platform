import { toast } from 'sonner';

function messageFromError(errorOrMessage, fallback = 'Something went wrong.') {
  if (!errorOrMessage) return fallback;
  if (typeof errorOrMessage === 'string') return errorOrMessage;

  const responseMessage =
    errorOrMessage.response?.data?.message ||
    errorOrMessage.response?.data?.error ||
    errorOrMessage.data?.message ||
    errorOrMessage.data?.error;

  return responseMessage || errorOrMessage.message || fallback;
}

function notify(type, message, description) {
  const options = description ? { description } : undefined;
  return toast[type](message, options);
}

export function notifySuccess(message, description) {
  return notify('success', message, description);
}

export function notifyError(errorOrMessage, fallback = 'Something went wrong.', description) {
  return notify('error', messageFromError(errorOrMessage, fallback), description);
}

export function notifyWarning(message, description) {
  return notify('warning', message, description);
}

export function notifyInfo(message, description) {
  return notify('info', message, description);
}

