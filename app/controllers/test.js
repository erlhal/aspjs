﻿register('ready',function() {
  
  /*
   * Testing Routes
   * These are for testing and framework development
   */

  app('/test', function(p) {
    res.die([req.method(), req.url('path'), req.params()]);
  });

  app('/test/binary', function(p) {
    var b = new Binary('\uC548\uB155\uD558\uC138\uC694', 'utf16');
    res.die([b.toString('hex'), b.length()]);
  });

  app('/test/json', function() {
    var json = require('json'), undef, fn = function(a){return true}, re = /abc/i;
    var a = {num: 1, str: 'strîng', arr: [1, 'two', true, '€', null, undef, fn], obj: {n: '2x9',
      val: 27}, dt: Date.fromString('29 Apr 2006'), re: re, fn: fn, bin: new Binary('«'),
      col: new Collection({a: 1, b: 'stür'}), undef: undef, nul: null, bool: false};
    var out = [json.stringify(a), json.stringify(a, true)];
    res.die(out.join('\r\n'), 'text/plain');
  });

  app('/test/upload', function() {
    var templ = require('templ');
    var html = templ.render('test/upload');
    res.die(html,'text/html');
  });

  app('/test/upload/post', function() {
    var json = require('json'), filestore = require('filestore');
    var out = [], uploads = req.uploads();
    uploads.each(function(n, upload) {
      out.push('<pre>' + htmlEnc(json.stringify(upload)) + '</pre>');
      var file = filestore.saveUpload(upload);
      out.push('<pre>' + htmlEnc(json.stringify(file)) + '</pre>');
      out.push('<p><a href="/test/dl/' + file.id + '/' + urlEnc(file.attr('name')) + '">' +
        htmlEnc(file.attr('name'))  + '</a></p>');
    });
    res.die(out.join('\r\n'),'text/html');
  });
  
  app('/test/dl/:id/:name', function(p) {
    var filestore = require('filestore');
    var file = filestore.getFile(p('id'));
    if (file) {
      file.send();
    } else {
      //Not Found: Request will fall through to default 404 action
    }
  });

  app('/test/md5/:str', function(p) {
    var out = [];
    out.push(p('str'));
    out.push(new Binary(p('str')).md5().toString('hex'));
    res.die(out.join('\r\n'));
  });

  app('/test/tz/:dt', function(p) {
    var dt = Date.fromUTCString(p('dt'));
    if (dt) {
      dt = app.util.applyTimezone(dt);
      res.die(Date.format(dt,'{yyyy}/{mm}/{dd} {hh}:{nn}:{ss}'));
    } else {
      res.die('Invalid Date');
    }
  });
  
  //test database
  app('/test/db', function(p) {
    var docstore = require('docstore')
      , store = docstore.getStore('main')
      , members = store.get('items');
    var m = {first:'Simon',last:'Sturmer'};
    m = members.save(m);
    m.last = 'Tester';
    members.save(m);
    res.die([m,m.__meta]);
  });
  
  //test docstore
  app('/test/docstore', function(p) {
    var docstore = require('docstore')
      , store = docstore.getStore('main');
    
    var items = store.get('items');
    
    var person = items.find({name:'simon'})[0]
    if (!person) {
      person = items.save({name:'simon',dob:Date.fromString('1970/01/01'),age:28});
    }
    person.name = 'sturmer';
    items.save(person,true);
    res.die(items.find({name:'sturmer'}));
  });
  
  //test email sending
  app('/test/email', function() {
    var net = require('net');
    net.sendEmail({
      to:        'simon.sturmer@gmail.com',
      from:      'simon@blupinnacle.net',
      subject:   'Test Message',
      body_text: 'Hello: This is a test.',
      body_html: '<h1>Hello</h1><p>This is a test.</p>'
    });
    var msg = 'Email Sent Successfully.';
    res.redirect('/?' + app.checkin({msg_text: msg}));
  });
  
  //test error handling
  app('/test/error/:err?', function(p) {
    var err = p('err') || 'Unspecified Error';
    throw new Error(err);
  });
  
});
