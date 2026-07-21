import type { AbzaSelectOption, UserListItem } from '@shared/types'
import { ASYNC_ENTITY_TAGS_PAGE_SIZE } from '@shared/ui/inputs'
import { fetchUsers } from '../api/userApi'

export function userToSelectOption(user: UserListItem): AbzaSelectOption {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return {
    value: user.id,
    label: fullName || user.email,
  }
}

export async function loadCandidateOptions(
  search: string,
  signal?: AbortSignal,
  page = 1,
) {
  const result = await fetchUsers(
    {
      page,
      size: ASYNC_ENTITY_TAGS_PAGE_SIZE,
      search: search || undefined,
      role: 'Candidate',
      sortBy: 'firstName',
      sortDir: 'asc',
    },
    { signal },
  )

  return {
    options: result.items.map(userToSelectOption),
    hasMore: result.page * result.size < result.totalCount,
  }
}

/** Non-paginated helper for selects that expect a flat options list. */
export async function loadCandidateSelectOptions(
  search: string,
  signal?: AbortSignal,
): Promise<AbzaSelectOption[]> {
  const { options } = await loadCandidateOptions(search, signal, 1)
  return options
}
