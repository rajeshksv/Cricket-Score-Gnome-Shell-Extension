/*
 * 
 * My First Gnome Shell extension . Yayyyyyy :)
 * 
 * Cricket Live Score Gnome Shell Extension
 *	- Displays live score on top panel
 *	- On click, displays more information
 *
 * Copyright (C) 2012
 *	- Rajesh KSV <rajeshksv37@gmail.com>
 *
 * This file is part of gnome-shell-extension-cricketlivescore
 *
 * Inspired from gnome-shell-extension-weater - https://github.com/ecyrbe/gnome-shell-extension-weather
 *
 * gnome-shell-extension-cricketlivescore is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * gnome-shell-extension-cricketlivescore is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell-extension-cricketlivescore.  If not, see <http://www.gnu.org/licenses/>

 * Known Issues 
 * When network disconnects in between, extension may not work till gnome shell reloads

 */


const Cairo = imports.cairo;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Soup = imports.gi.Soup;
const St = imports.gi.St;
const Util = imports.misc.util;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const XML = Me.imports.rexml;

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());


function cricketScoreButton() {
	this._init();
}


cricketScoreButton.prototype = {
	__proto__: PanelMenu.Button.prototype,

	_init: function() {
		PanelMenu.Button.prototype._init.call(this, 0.25);

		let topBox = new St.BoxLayout();
		this._scoreInfo = new St.Label({ text: _('Loading.....') });
		topBox.add_actor(this._scoreInfo);
		this.actor.add_actor(topBox);


		let children = null;
		children = Main.panel._centerBox.get_children();
		Main.panel._centerBox.insert_child_at_index(this.actor, children.length);
				     
		if(typeof Main.panel._menus == "undefined")
			Main.panel.menuManager.addMenu(this.menu);
		else
			Main.panel._menus.addMenu(this.menu);


		this._moreInfo = new St.Bin();
		this._refreshedDate = new St.Bin();

		this.menu.box.add(this._moreInfo);
		let item = new PopupMenu.PopupSeparatorMenuItem();
		this.menu.addMenuItem(item);
		this.menu.box.add(this._refreshedDate);

		this.showLoadingUi();

		Mainloop.timeout_add_seconds(3, Lang.bind(this, function() {
			this.refreshScore(true);
		}));

	},

	destroyCurrentInfo: function() {
		if (this._moreInfo.get_child() != null) {
			this._moreInfo.get_child().destroy();
		}   
		if(this._refreshedDate.get_child() != null) {
			this._refreshedDate.get_child().destroy();
		}
	},


        load_xml_async: function(url, fun) {
		let here = this;
		let message = Soup.Message.new('GET', url);
		_httpSession.queue_message(message, function(session, message) {
			if (message.status_code !== 200) {
				global.log("curl failed");
				return;
			}
			fun.call(here,message.response_body.data) ;
		});
    	},
	
	refreshScore: function(recurse) {
		// Not sure if this API is public or not - hence not releasing this extension officially :(
        	let url = "http://synd.cricbuzz.com/j2me/1.0/livematches.xml";
		//let url = "http://localhost/score.xml";
        	this.load_xml_async(url , function(content) {
            	try {
			// Using custom XML parser as E4X is no longer supported
			let oxml=new XML.REXML(content.replace('<?xml version="1.0" encoding="utf-8" ?>',''));
              		let i=0;
			while(typeof(oxml.rootElement.childElements[i]) !='undefined') {
				var d  = new Date();
				var hrs = (d.getHours() < 10) ? ("0" + d.getHours()) : d.getHours();
				var min = (d.getMinutes() < 10) ? ("0" + d.getMinutes()) : d.getMinutes();
				var sec = (d.getSeconds() < 10) ? ("0" + d.getSeconds()) : d.getSeconds();
				var currentTime = hrs + " : " + min + " : " + sec + " IST ";
				let matchEntry=oxml.rootElement.childElements[i];
				if (matchEntry.name == 'match'){
					if(matchEntry.childElement("state").attribute("mchState") == "preview") {
						  let j=0;
						  let team1="NA"; let team2="NA"; let status;
						  while(typeof(matchEntry.childElements[j])!='undefined'){
							  let matchEntryChild = matchEntry.childElements[j];
							  if(matchEntryChild.name == 'state'){
							  	status = matchEntryChild.attribute("status"); 
							  } else if(matchEntryChild.name == 'Tm') {
							  	let team = matchEntryChild.attribute("sName");
								if(team1 == "NA"){
									team1 = team;
								} else {
									team2 = team;
								}
							  }
							  j++;
						  }
						  this._scoreInfo.text = team1 + " vs " + team2 + " ( Upcoming ) ";
						  this._moreInfo.get_child().text = "Dont waste your time ! Match " + status; 
						  this._refreshedDate.get_child().text = "  Last Refreshed on   " + currentTime; 
					} else {
						let btTeamEntry = matchEntry.childElement("mscr").childElement("btTm");
						let blgTeamEntry = matchEntry.childElement("mscr").childElement("blgTm");
						let team1 = btTeamEntry.attribute("sName");
						let team2 = blgTeamEntry.attribute("sName");
						let inngs1 = btTeamEntry.childElement("Inngs");
						let inngs2 = blgTeamEntry.childElement("Inngs");
						let inngsdetail = matchEntry.childElement("mscr").childElement("inngsdetail");
						let scoreText = null;
						scoreText = team1  +  "-" + inngs1.attribute("r") + "/";
						scoreText += inngs1.attribute("wkts") + " ("  + inngs1.attribute("ovrs") + ")";
						this._scoreInfo.text = scoreText;
						scoreText += " vs " + team2;
						if(blgTeamEntry.childElements.length > 0) { 
							scoreText += "-" + inngs2.attribute("r");
						}       

						let moreInfo = "";
						let status = matchEntry.childElement("state").attribute("status");
						moreInfo = scoreText + "\n\n" + status + "\n\n";
						let requiredRR = inngsdetail.attribute("rrr");
						if(requiredRR != "") { 
							moreInfo += "Required RunRate   : " + requiredRR + "\n\n";
						}
						moreInfo  += "Current RunRate   : " + inngsdetail.attribute("crr");
						moreInfo += "\n\n" + "Current PrtnrShip : " + inngsdetail.attribute("cprtshp");
						let refreshedDate  =  "Last Refreshed on  " + currentTime;
						this._moreInfo.get_child().text = moreInfo;
						this._refreshedDate.get_child().text = refreshedDate;
					}
					break;
				}
				i++;
			}

			// end of while loop

		}
		catch(e){
			global.log('A ' + e.name + ' has occured: ' + e.message);
		}

		if(recurse) {
			this._timeoutS = Mainloop.timeout_add_seconds(10, Lang.bind(this, function() {
			this.refreshScore(true);}));
		}});
    	},


	showLoadingUi: function() {
		this.destroyCurrentInfo();
		this._moreInfo.set_child(new St.Label({ style_class:'moreInfo' , text: _('Loading More Info ...') }));
		this._refreshedDate.set_child(new St.Label({ style_class:'moreInfo' , text: _('Loading  Last Refreshed Date...') }));
	},

	stop: function()
	{
		if(this._timeoutS)
		Mainloop.source_remove(this._timeoutS);
	}

}

let cricketScore;
function init() {

}

function enable() {
	cricketScore = new cricketScoreButton();
	Main.panel.addToStatusArea('cricketMenu', cricketScore);
}

function disable() {
	cricketScore.stop();
	cricketScore.destroy();
}
