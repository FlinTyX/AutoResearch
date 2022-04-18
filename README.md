# Auto Research
![logo](logo.png)


A simple mod that researches content automatically!

### Algorithm Description

Looks up for avaliable tech nodes with all the objectives completed, then sorts them by real cost.
First of all it unlocks content like maps and items (with no costs), then it researches the cheapest node with the avaliable items in the planet. 

For example: 
You only have `Copper` in your items list, and the algorithm has filtered `Distributor` and `Copper Wall`.
It will priorize `Copper Wall`, because `Distributor` needs `Lead` to be unlocked.

You can disable the auto-research in Settings/Game/Auto Research


![image](icon.png)