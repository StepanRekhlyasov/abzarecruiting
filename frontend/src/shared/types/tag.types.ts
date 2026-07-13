export type TagDto = {
  id: number
  name: string
  createdAt: string
  version: number
}

export type CreateTagRequest = {
  name: string
}

export type UpdateTagRequest = CreateTagRequest & {
  version: number
}
