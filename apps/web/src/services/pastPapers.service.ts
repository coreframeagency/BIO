import { apiFetch, apiUpload, getAccessToken } from '@/services/api';
import { PastPaper } from '@/types';

function ensureAuthHeaders(): void {
  if (!getAccessToken()) {
    throw new Error('Not authenticated');
  }
}

export async function uploadPastPaper(formData: FormData) {
  ensureAuthHeaders();
  return apiUpload<PastPaper>('/past-papers', formData);
}

export async function getPastPapers(subjectId?: string) {
  ensureAuthHeaders();
  const query = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : '';
  return apiFetch<PastPaper[]>(`/past-papers${query}`);
}

export async function deletePastPaper(id: string) {
  ensureAuthHeaders();
  return apiFetch<PastPaper>(`/past-papers/${id}`, { method: 'DELETE' });
}
