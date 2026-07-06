import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { AbzaTableProps, AbzaTableRowId } from '../model/types'

export function AbzaTable<T>({
  columns,
  rows,
  getRowId,
  toolbar,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  loading = false,
  emptyMessage = 'No data',
  loadingMessage = 'Loading...',
}: AbzaTableProps<T>) {
  const selectedSet = new Set(selectedIds)
  const pageRowIds = rows.map(getRowId)
  const selectedOnPageCount = pageRowIds.filter((id) => selectedSet.has(id)).length
  const allSelectedOnPage = rows.length > 0 && selectedOnPageCount === rows.length
  const someSelectedOnPage = selectedOnPageCount > 0 && !allSelectedOnPage

  const toggleRow = (rowId: AbzaTableRowId) => {
    if (!onSelectionChange) {
      return
    }

    if (selectedSet.has(rowId)) {
      onSelectionChange(selectedIds.filter((id) => id !== rowId))
      return
    }

    onSelectionChange([...selectedIds, rowId])
  }

  const toggleAllOnPage = () => {
    if (!onSelectionChange) {
      return
    }

    if (allSelectedOnPage) {
      onSelectionChange(selectedIds.filter((id) => !pageRowIds.includes(id)))
      return
    }

    const merged = new Set([...selectedIds, ...pageRowIds])
    onSelectionChange([...merged])
  }

  return (
    <Paper elevation={1}>
      {toolbar && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          {toolbar}
        </Box>
      )}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={someSelectedOnPage}
                    checked={allSelectedOnPage}
                    onChange={toggleAllOnPage}
                    disabled={loading || rows.length === 0}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.id} sx={{ width: column.width }}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    {loading ? loadingMessage : emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const rowId = getRowId(row)
                const isSelected = selectedSet.has(rowId)

                return (
                  <TableRow
                    key={rowId}
                    hover
                    selected={isSelected}
                    onClick={() => onRowClick?.(row)}
                    sx={onRowClick ? { cursor: 'pointer' } : undefined}
                  >
                    {selectable && (
                      <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                        <Checkbox checked={isSelected} onChange={() => toggleRow(rowId)} disabled={loading} />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.id}>{column.render(row)}</TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        rowsPerPage={pageSize}
        onPageChange={(_, nextPage) => onPageChange(nextPage)}
        onRowsPerPageChange={(event) => onPageSizeChange?.(Number(event.target.value))}
        rowsPerPageOptions={[10, 20, 50]}
      />
    </Paper>
  )
}
