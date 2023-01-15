let cached = null, next = null, nodes = null,
    pane = null, info = null;

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
    return node.parent && !node.parent.content.locked() && (node.objectives.size < 1 || node.objectives.select(e => !e.complete()).size == 0)
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
    nodes = nodes.filter(node => node.content.locked());
    cached = nodes.filter(e => isValid(e) && e.content.locked()).sort((a, b) => realCost(a) - realCost(b));
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
    info.add("@researcher.researchlist").pad(6);
    info.row();
    info.image().width(250).height(3.5).color(Pal.accent).margin(8);
    info.row();
    
    if(cached.length > 0) info.add(pane).maxHeight(800).pad(10);
    else info.add("[lightgray]" + Core.bundle.get("none")).padTop(5).pad(5);
    
    info.row();

    if(Core.settings.getBool("autoresearch")){
        while(cached.length > 0 && getNode() != null) updateTree();
    }
}

Events.on(ClientLoadEvent, () => {
    if(!Core.settings.has("autoresearch")){
        Core.settings.put("autoresearch", true);
    }

    info = new Table();
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

    pane.update(() => {
        pane.widget.clear();
        pane.widget.row();

        cached.forEach(node => {
            pane.widget.add((node.content.hasEmoji() ? node.content.emoji() + " " : "") + node.content.localizedName).padTop(5).pad(5);
            pane.widget.row();
        });
    });

    Vars.ui.research.shown(() => {
        nodes = Vars.ui.research.nodes.toSeq();
        nodes.replace(node => node.node);
        nodes = nodes.toArray();

        rebuild();
    });

    Vars.ui.research.fill(null, t => {
        t.top();
        t.add(log).padTop(60);
    });

    Vars.ui.research.fill(null, t => {
        t.top().right();
        t.add(info).margin(8);
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