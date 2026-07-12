// DB row ↔ frontend entry shape converters, shared between state.js (bulk read)
// and log.js / callqueue.js (return the row just written).

function rowToLogEntry(r) {
  return {
    id: r.id,
    gk: r.gk,
    name: r.name,
    contact: r.contact || undefined,
    doctor: r.doctor,
    doctorName: r.doctor_name || undefined,
    queue: r.queue,
    type: r.type,
    status: r.status,
    fileStatus: r.file_status || undefined,
    visits: r.visits,
    time: r.time,
    priority: !!r.priority,
    checkedInBy: r.checked_in_by || undefined,
    fileMarkedBy: r.file_marked_by || undefined,
  };
}

function rowToCallQueueEntry(r) {
  return {
    id: r.id,
    docCode: r.doc_code,
    name: r.name || undefined,
    gk: r.gk || undefined,
    queue: r.queue || undefined,
    time: r.time || undefined,
    status: r.status,
    priority: !!r.priority,
  };
}

module.exports = { rowToLogEntry, rowToCallQueueEntry };
