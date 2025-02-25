async function search(req, res) {
  res.render('gadget',{
    'active': 'gadget',
    'data': [],
  })
}
module.exports = { 
  search
}
