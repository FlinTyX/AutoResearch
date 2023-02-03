let priorities = [], cached, next, nodes, pane, info, tutorial;

const interval = new Interval(), filters = {
    all: ["cheap", "expensive", "unit", "block", "modded", "vanilla"],
    cheap: c => c.sort((a, b) => realCost(a) - realCost(b)),
    expensive: c => c.sort((a, b) => realCost(b) - realCost(a)),
    unit: c => c.filter(node => node.content instanceof UnitType).sort((a, b) => realCost(a) - realCost(b)),
    block: c => c.filter(node => node.content instanceof Block).sort((a, b) => realCost(a) - realCost(b)),
    modded: c => c.filter(node => node.content.minfo.mod != null).sort((a, b) => realCost(a) - realCost(b)),
    vanilla: c => c.filter(node => node.content.minfo.mod == null).sort((a, b) => realCost(a) - realCost(b))
}

function canSpend(node){
    return Reflect.invoke(ResearchDialog.View, Vars.ui.research.view, "canSpend", [node], [TechTree.TechNode]);
}

function spend(node){
    Reflect.invoke(ResearchDialog.View, Vars.ui.research.view, "spend", [node], [TechTree.TechNode]);

    if(!node.content.locked()){
        refreshCached();
    }
}

function realCost(node){
    let cost = 0;

    if(node.content.locked()){
        node.requirements.forEach((r, i) => {
            cost += r.item.cost * (r.amount - node.finishedRequirements[i].amount);
        });
    }

    return cost;
}

function isValid(node){
    return node.parent && 
           node.content.locked() &&
           !node.parent.content.locked() && 
           (node.objectives.size < 1 || node.objectives.select(e => !e.complete()).size == 0)
}

function getNode(){
    let n = null;

    cached.forEach(node => {
        if(n != null) return;
        
        for(let i = 0; i < node.requirements.length; i++){
            if(!Vars.ui.research.items.has(node.requirements[i].item) && node.requirements[i].amount - node.finishedRequirements[i].amount > 0) return;
        }

        n = node;
    });

    return n;
}

function refreshCached(){
    priorities = priorities.filter(n => isValid(n));
    
    cached = filters[Core.settings.getString("autoresearch.filter")](priorities).concat(
        filters[Core.settings.getString("autoresearch.filter")](
            nodes.filter(e => isValid(e) && !priorities.includes(e))
        )
    );
}

function updateTree(){
    cached.forEach(node => {
        if(realCost(node) == 0){
            spend(node);
        }

        if(!Vars.ui.research.items.toString().equals("{}")){
            next = getNode();

            if(next) spend(next);
        }
    });
}

function rebuild(){
    refreshCached();
                
    info.clear();
    info.add("@researcher.researchlist").pad(8);
    info.row();
    info.image().width(250).height(3.5).color(Pal.accent).margin(10).padTop(5);
    info.row();
    
    info.table(null, t => {
        if(cached.length > 0) info.add(pane).maxHeight(300).pad(10);
        else info.add("[lightgray]" + Core.bundle.get("none")).padTop(5).pad(5);
    });

    info.row();
    info.add("@researcher.filter").pad(5).color(Pal.accent);
    info.row();
    info.table(null, t => {
        function change(side){
            let i = filters.all.indexOf(Core.settings.getString("autoresearch.filter")) + side;

            if(i > filters.all.length - 1) i = 0;
            if(i < 0) i = filters.all.length - 1;

            Core.settings.put("autoresearch.filter", filters.all[i]);

            rebuild();
        }

        t.button(Icon.leftSmall, Styles.emptyi, () => {
            change(-1);
        }).size(32).left();

        t.table(null, tt => {
            tt.add("").update(l => l.setText(Core.bundle.get("researcher.filter." + Core.settings.getString("autoresearch.filter"))));
        }).grow().size(186, 32).center();

        t.button(Icon.rightSmall, Styles.emptyi, () => {
            change(1);
        }).size(32).right();

        t.row();
    }).growX().fillX().center().padTop(5);

    info.row();
    info.button(Icon.infoSmall, Styles.emptyi, () => {
        tutorial.show();
    }).grow().size(250, 50).padBottom(5).center();
    info.row();

    if(Core.settings.getBool("autoresearch")){
        while(cached.length > 0 && getNode() != null) updateTree();
    }
}

Events.on(ClientLoadEvent, () => {
    if(!Core.settings.has("autoresearch")){
        Core.settings.put("autoresearch", true);
    }

    if(!Core.settings.has("autoresearch.filter")){
        Core.settings.put("autoresearch.filter", "cheap");
    }

    if(!Core.settings.has("autoresearch.priorities")){
        Core.settings.put("autoresearch.priorities", "");
    }

    info = new Table();
    tutorial = new Dialog();
    pane = new ScrollPane(new Table(), Styles.smallPane);

    const log = new Table(null, t => {
            t.add("Invalid").update(label => {
                label.color.set(Pal.remove);

                if(cached.length < 1){
                    label.setText(Core.bundle.get("researcher.emptycache"));
                } 
                else {
                    label.setText(Core.bundle.get("researcher.lackitems"));
                }
            }).pad(6);

            t.row();

            t.add("").update(label => {
                label.setText(cached.length > 0 ? Core.bundle.format("researcher.next", cached[0].content.localizedName) : "");
            }).get().setFontScale(0.86);
    });

    pane.widget.top();
    pane.update(() => {
        if(interval.get(30)){
            pane.widget.clear();
            pane.widget.row();

            cached.forEach(node => {
                const table = pane.widget.table(null, t => {
                    t.touchable = Touchable.enabled;
                    t.image(node.content.fullIcon).size(16).padRight(5).pad(5);
                    t.add(node.content.localizedName).padTop(5).pad(5).color(priorities.includes(node) ? Pal.power : Color.white);
                    pane.widget.row();
                }).get();
                
                table.addListener(extend(ClickListener, {
                    clicked(event, x, y){
                        if(priorities.includes(node)) priorities.splice(priorities.indexOf(node), 1);
                        else priorities.push(node);
                        rebuild();
                    }
                }));

                table.addListener(new HandCursorListener());
            });
        }
    });

    tutorial.fill(null, t => {
        const w = Core.graphics.getWidth() * 0.8;

        t.add("@researcher.info.title", Styles.defaultLabel, 1).padLeft(4);
        t.row();
        t.image(Tex.whiteui, Pal.accent).growX().height(4).pad(5).padTop(10).width(w * 0.65);
        t.row();
        t.add("@researcher.info.text").width(w).wrap().pad(10);
        t.row();

        t.table(null, tt => {
            tt.image(Blocks.router.fullIcon).size(16).padRight(5).pad(5);
            tt.add(Blocks.router.localizedName).update(l => {
                l.color.set(Color.white).lerp(Pal.power, Mathf.absin(8, 1));
            });
        });

        t.row();
        t.add("@researcher.info.thanks").width(w).wrap().pad(10);
        t.row();

        t.button("@back", Icon.left, () => {
            tutorial.hide();
        }).size(300, 54).pad(8).padTop(10);

        Core.settings.getBoolOnce("researcher.showtutorial", () => tutorial.show());
    });

    /**
     * Update nodes
     * Load up priorities if needed
     * Rebuild
     */
    Vars.ui.research.shown(() => {
        nodes = Vars.ui.research.nodes.toSeq();
        nodes.replace(node => node.node);
        nodes = nodes.toArray();

        if(priorities.length < 1){
            const pt = Core.settings.getString("autoresearch.priorities");

            nodes.forEach(n => {
                if(pt.includes(n.content.name)) priorities.push(n);
            });
        }
        
        rebuild();
    });

    /**
     * Save up priorities
     */
    Vars.ui.research.hidden(() =>  {
        let pt = "";

        priorities.forEach(n => pt += n.content.name + " ");

        Core.settings.put("autoresearch.priorities", pt);
    });

    Vars.ui.research.fill(null, t => {
        t.top();
        t.add(log).padTop(60);
    });

    Vars.ui.research.fill(null, t => {
        t.top().right();
        t.add(info);
    });

    Vars.ui.settings.game.checkPref(
        "autoresearch", 
        Core.settings.getBool("autoresearch"),
        bool => {
            log.visible = info.visible = bool;
            Core.settings.put("autoresearch", bool);
        }
    );
});