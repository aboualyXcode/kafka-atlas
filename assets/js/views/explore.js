// The map explorer behind three views: home, Architecture (cluster map) and AWS (MSK in your VPC).
// Routes: #/architecture, #/architecture/c/<component>, #/architecture/flow/<flow>/<step>,
//         #/aws?layer=<lens> (and the same /c/ and /flow/ forms).
(function (KA) {
  "use strict";
  var u = KA.u, ui = KA.ui, esc = u.esc, R = KA.route;
  function lensById(id) { return KA.data.lenses.filter(function (l) { return l.id === id; })[0]; }
  function query(ctx) { return ctx.lens ? { layer: ctx.lens } : {}; }
  function flowItem(fl, view, q) {
    return '<li><a href="' + R.build([view, "flow", fl.id], q) + '"><b>' + esc(fl.title) + "</b><span>" + esc(fl.summary) + "</span><small>" + u.plural(fl.steps.length, "step") + "</small></a></li>";
  }
  function back(href, label) { return '<a class="back" href="' + href + '">' + esc(label) + "</a>"; }

  function prodLayout() {
    var s = '<svg class="inset" viewBox="0 0 440 300" role="img" aria-label="Production layout: three Availability Zones, each with clients, a broker, a managed controller and an EBS volume">';
    s += '<rect class="in-vpc" x="6" y="44" width="428" height="250" rx="14"/><text class="in-t" x="18" y="64">Your VPC: one broker subnet per Availability Zone</text>';
    s += '<rect class="in-cp" x="6" y="4" width="200" height="30" rx="8"/><text class="in-t" x="16" y="24">MSK service (AWS account)</text>';
    s += '<rect class="in-alb" x="230" y="4" width="204" height="30" rx="8"/><text class="in-t" x="240" y="24">Tiered storage in S3 (regional)</text>';
    ["a", "b", "c"].forEach(function (az, i) {
      var x = 18 + i * 140;
      s += '<rect class="in-az" x="' + x + '" y="74" width="128" height="210" rx="10"/><text class="in-t in-b" x="' + (x + 10) + '" y="92">AZ ' + az + "</text>";
      [["Your clients", "in-node"], ["Broker b-" + (i + 1), "in-pod"], ["Controller (managed)", "in-pub"], ["EBS volume", "in-data"]].forEach(function (row, r) {
        var y = 102 + r * 45;
        s += '<rect class="' + row[1] + '" x="' + (x + 8) + '" y="' + y + '" width="112" height="36" rx="7"/><text class="in-t" x="' + (x + 16) + '" y="' + (y + 23) + '">' + row[0] + "</text>";
      });
      s += '<path class="in-link" d="M105 34 L' + (x + 64) + ' 147"/>';
    });
    return s + "</svg>";
  }

  function explorer(cfg) {
    var view = {};
    view.mount = function (main, route) {
      var f = ui.frame(main, "stage--" + cfg.view);
      var mapDef = KA.data.maps[cfg.map];
      var ctx = { f: f, mapDef: mapDef, linkView: cfg.view === "home" ? "architecture" : cfg.view };
      ctx.map = KA.Map(f.body, mapDef, {
        onSelect: function (id) { R.go(R.build([ctx.linkView, "c", id], query(ctx))); },
        onBackground: function () { if (ctx.selected) R.go(R.build([ctx.linkView], query(ctx))); },
      });
      u.on(f.panel, "click", "[data-select]", function (ev, el) { R.go(R.build([ctx.linkView, "c", el.getAttribute("data-select")], query(ctx))); });
      u.on(f.panel, "click", "[data-step]", function (ev, el) { if (ctx.player) { ctx.player.pause(); ctx.player.show(+el.getAttribute("data-step")); } });
      u.on(f.panel, "pointerover", "[data-select]", function (ev, el) { ctx.map.focus(el.getAttribute("data-select")); });
      u.on(f.panel, "pointerout", "[data-select]", function () { ctx.map.focus(null); });
      view.update(ctx, route);
      return ctx;
    };

    view.update = function (ctx, route) {
      var p = route.parts;
      ctx.lens = cfg.view === "aws" && route.query.layer && lensById(route.query.layer) ? route.query.layer : null;
      head(ctx);
      if (p[0] === "flow" && ctx.player && ctx.flowId === p[1]) {
        var want = Math.max(0, (+p[2] || 1) - 1);
        if (ctx.player.index() !== want) ctx.player.show(want);
        return;
      }
      stop(ctx);
      if (p[0] === "c" && ctx.map.has(p[1])) return component(ctx, p[1]);
      var fl = p[0] === "flow" && KA.idx.flow(p[1]);
      if (fl && fl.map === cfg.map) return flow(ctx, fl, Math.max(0, (+p[2] || 1) - 1));
      if (cfg.view === "home") return home(ctx);
      if (ctx.lens) return lens(ctx);
      return cfg.view === "aws" ? awsOverview(ctx) : archOverview(ctx);
    };

    view.unmount = function (ctx) { stop(ctx); ctx.map.destroy(); };

    function stop(ctx) {
      if (ctx.player) { ctx.player.destroy(); ctx.player = null; }
      ctx.flowId = null;
      ctx.selected = null;
      ctx.map.clear();
      ctx.f.foot.innerHTML = "";
      ctx.f.foot.hidden = true;
      if (ctx.lens) ctx.map.lens(lensById(ctx.lens).stations);
    }

    function head(ctx) {
      var h = "";
      if (cfg.view === "aws") {
        h += '<div class="seg" role="group" aria-label="Lens"><a href="#/aws" class="' + (!ctx.lens ? "is-on" : "") + '">Everything</a>' +
          KA.data.lenses.map(function (l) { return '<a href="#/aws?layer=' + l.id + '" class="' + (ctx.lens === l.id ? "is-on" : "") + '">' + esc(l.name) + "</a>"; }).join("") + "</div>";
      }
      ctx.f.head.innerHTML = h + ui.legend();
    }

    function component(ctx, id) {
      ctx.selected = id;
      ctx.map.select(id);
      var to = cfg.view === "aws" && ctx.lens ? "#/aws?layer=" + ctx.lens : "#/" + ctx.linkView;
      ui.setPanel(ctx.f, back(to, ctx.lens ? lensById(ctx.lens).name : "Overview") + ui.inspector(id, ctx.mapDef, ctx.linkView));
      KA.setTitle(KA.data.components[id].name);
    }

    function flow(ctx, fl, start) {
      ctx.flowId = fl.id;
      var breaks = u.uniq([].concat.apply([], fl.steps.map(function (s) { return s.breaks || []; })));
      ui.setPanel(ctx.f, back("#/" + ctx.linkView + (ctx.lens ? "?layer=" + ctx.lens : ""), ctx.lens ? lensById(ctx.lens).name : "Overview") +
        '<header class="ph"><p class="eyebrowless">Flow</p><h1>' + esc(fl.title) + "</h1></header>" +
        '<p class="lede">' + esc(fl.summary) + "</p>" +
        '<ol class="steps">' + fl.steps.map(function (s, k) {
          return '<li><button type="button" data-step="' + k + '"><span class="steps-n">' + (k + 1) + "</span>" + esc(s.title) + "</button></li>";
        }).join("") + "</ol>" +
        (breaks.length ? "<h2>Where this flow can break</h2><p class=\"chips\">" + KA.failChips(breaks) + "</p>" : ""));
      ctx.f.foot.hidden = false;
      ctx.player = KA.Player(ctx.map, fl, ctx.f.foot, {
        start: start,
        onStep: function (i) {
          u.$$("[data-step]", ctx.f.panel).forEach(function (b) { b.classList.toggle("is-on", +b.getAttribute("data-step") === i); });
          R.go(R.build([ctx.linkView, "flow", fl.id, i + 1], query(ctx)), true);
        },
      });
      KA.setTitle(fl.title);
    }

    function home(ctx) {
      var D = KA.data;
      var picks = ["send-fails", "lag", "rebalancing", "cannot-connect", "urp", "offline", "stuck-record", "missing-data", "not-authorized", "broker-down"];
      ui.setPanel(ctx.f,
        '<header class="ph ph--home"><h1>Kafka, drawn as a map you can click</h1></header>' +
        '<p class="lede">Every part of a Kafka cluster, what it does, how a record travels through it, and how a failure in one part shows up somewhere else. The map is playing a record&rsquo;s journey from <code>send()</code> to acknowledged. Click any station to open it.</p>' +
        "<h2>What are you seeing?</h2><p class=\"chips chips--big\">" + picks.map(function (id) {
          var s = D.triage.filter(function (t) { return t.id === id; })[0];
          return s ? '<a class="chip chip--sym" href="#/failures?symptom=' + id + '">' + esc(s.label) + "</a>" : "";
        }).join("") + "</p>" +
        '<p><a class="cta" href="#/failures?mode=paste">Paste an exception or command output</a></p>' +
        '<h2>Where to go</h2><ul class="doors">' +
        '<li><a href="#/architecture"><b>Architecture</b><span>' + KA.data.maps.cluster.stations.length + " components of a cluster, how each works inside, and " + KA.idx.flowsFor("cluster").length + " animated flows.</span></a></li>" +
        '<li><a href="#/aws"><b>Kafka on AWS</b><span>Amazon MSK in your VPC: networking, security, storage, deployment and monitoring, one lens at a time.</span></a></li>' +
        '<li><a href="#/failures"><b>Failures</b><span>' + D.failures.length + " failures, each animated from where it starts to where you notice it.</span></a></li>" +
        '<li><a href="#/incidents"><b>Incidents</b><span>' + D.incidents.length + " production investigations, replayed hop by hop.</span></a></li>" +
        '<li><a href="#/operations"><b>Operations</b><span>Signals, incident response, runbooks, rolling upgrades, sizing and security.</span></a></li></ul>');
      ctx.f.foot.hidden = false;
      ctx.player = KA.Player(ctx.map, KA.idx.flow("produce-path"), ctx.f.foot, { autoplay: !u.reducedMotion(), interval: 3000 });
      KA.setTitle("");
    }

    function archOverview(ctx) {
      var D = KA.data, stations = ctx.mapDef.stations.map(function (s) { return s.id; });
      ui.setPanel(ctx.f,
        '<header class="ph"><h1>How a Kafka cluster fits together</h1></header>' +
        '<p class="lede">Producers write to the leader of each partition; followers on other brokers copy it; consumers in a group split the partitions between them. The controller quorum decides who leads what.</p>' +
        '<h2>Play a flow</h2><ul class="flowlist">' + KA.idx.flowsFor("cluster").map(function (fl) { return flowItem(fl, "architecture", {}); }).join("") + "</ul>" +
        "<h2>Components</h2>" + Object.keys(D.planes).map(function (p) {
          var ids = stations.filter(function (id) { return D.components[id].plane === p; });
          return ids.length ? "<h3>" + esc(D.planes[p].name) + '</h3><p class="chips">' + ids.map(function (id) {
            return '<button type="button" class="chip chip--comp plane-dot--' + p + '" data-select="' + id + '">' + esc(KA.geom.label(ctx.mapDef, id)) + "</button>";
          }).join("") + "</p>" : "";
        }).join(""));
      KA.setTitle("Architecture");
    }

    function awsOverview(ctx) {
      ui.setPanel(ctx.f,
        '<header class="ph"><h1>Kafka on AWS</h1></header>' +
        '<p class="lede">Amazon MSK runs brokers and controllers in your VPC&rsquo;s subnets, one set per Availability Zone. Your applications connect inside the VPC with IAM, SASL/SCRAM or TLS. Pick a lens to see one concern at a time.</p>' +
        '<h2>Lenses</h2><ul class="flowlist">' + KA.data.lenses.map(function (l) {
          return '<li><a href="#/aws?layer=' + l.id + '"><b>' + esc(l.name) + "</b><span>" + esc(l.summary) + "</span></a></li>";
        }).join("") + "</ul>" +
        "<h2>Who runs what</h2>" + ui.table(["MSK runs", "You run"], [
          ["Broker and controller software, patching and replacement", "Topics, partitions, retention and client settings"],
          ["Broker storage and its encryption", "Capacity: broker size and count, storage throughput"],
          ["Rolling version upgrades, when you ask for them", "When to upgrade, and client compatibility"],
          ["Metrics in CloudWatch at the level you choose", "Alerts, dashboards and consumer lag objectives"],
        ]) +
        "<h2>A production layout</h2>" + prodLayout() +
        '<p class="note">Each partition&rsquo;s replicas land in different Availability Zones (rack awareness), so one zone can fail. Replication and reads across zones are billed as data transfer.</p>' +
        '<h2>Flows</h2><ul class="flowlist">' + KA.idx.flowsFor("aws").map(function (fl) { return flowItem(fl, "aws", {}); }).join("") + "</ul>");
      KA.setTitle("Kafka on AWS");
    }

    function lens(ctx) {
      var l = lensById(ctx.lens);
      var fails = KA.data.failures.filter(function (f) { return (l.layers || []).indexOf(f.layer) >= 0; }).map(function (f) { return f.id; });
      ui.setPanel(ctx.f, back("#/aws", "AWS overview") +
        '<header class="ph"><p class="eyebrowless">Lens</p><h1>' + esc(l.name) + "</h1></header>" +
        '<p class="lede">' + esc(l.summary) + "</p>" +
        (l.flows.length ? '<h2>Flows</h2><ul class="flowlist">' + l.flows.map(function (id) { return flowItem(KA.idx.flow(id), "aws", { layer: l.id }); }).join("") + "</ul>" : "") +
        "<h2>" + esc(l.decide.title) + "</h2>" + ui.table(l.decide.cols, l.decide.rows) +
        (l.widget ? '<h2>Size the cluster</h2><div class="calc-host"></div>' : "") +
        '<h2>Components in this lens</h2><p class="chips">' + l.stations.map(function (id) {
          var c = KA.data.components[id];
          return '<button type="button" class="chip chip--comp plane-dot--' + c.plane + '" data-select="' + id + '">' + esc(KA.geom.label(ctx.mapDef, id)) + "</button>";
        }).join("") + "</p>" +
        "<h2>Failures in this area</h2><p class=\"chips\">" + KA.failChips(fails) + "</p>");
      if (l.widget) ui.capacity(u.$(".calc-host", ctx.f.panel), { compact: true });
      KA.setTitle("AWS " + l.name.toLowerCase());
    }
    return view;
  }

  KA.views = KA.views || {};
  KA.views.home = explorer({ view: "home", map: "cluster" });
  KA.views.architecture = explorer({ view: "architecture", map: "cluster" });
  KA.views.aws = explorer({ view: "aws", map: "aws" });
})(window.KA);
