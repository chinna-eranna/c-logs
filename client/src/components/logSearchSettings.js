import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import FormControl from 'react-bootstrap/FormControl';
import Form from 'react-bootstrap/Form';
import * as types from '../actions/actionTypes';
import * as actions from '../actions/applicationActions'
import styles from '../css/app.css';


export class LogSearchSettings extends Component {

    constructor(props) {
        super(props);
        this.state = {searchStrType:'TXT'};
        this.search = this.search.bind(this);
        this.togglesearchStrType = this.togglesearchStrType.bind(this);
        this.searchTextChangeHandler = this.searchTextChangeHandler.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);

        this.moveSearchCursor = this.moveSearchCursor.bind(this);
        this.stopSearch  = this.stopSearch.bind(this);
       
    }
    handleKeyPress(evt){
        const keyCode = evt.keyCode ? evt.keyCode : evt.charCode
        if (keyCode === 13 /*Enter Key code */ || evt.which === 13 || evt.key === 'Enter')
           this.search();
    }

    searchTextChangeHandler(evt){
        this.props.setSearchText(this.props.app.Id,  evt.target.value);
    }

    togglesearchStrType(){
        if(this.state.searchStrType === '.*'){
            this.setState({searchStrType:'TXT'});
        }else{
            this.setState({searchStrType:'.*'});
        }
    }

    search(){
        if(this.props.app.searchText  && this.props.app.searchText.length > 0){
            this.props.search(this.props.app, this.state.searchStrType);
        }else{
            console.log("Search is not trigger for app ", this.props.app, "as searchText is null")
        }
    }


    moveSearchCursor(action){
        if(this.props.app.searchCursor === undefined){
            console.log("searchCursor is not defined");
            this.props.moveSearchCursor(this.props.app, 0);
            return;
        }
        console.log("Moving search cursor for action  " +  action + " - current searchCursor: "  +  this.props.app.searchCursor);
        switch(action){
            case 'next':
                this.props.moveSearchCursor(this.props.app, this.props.app.searchCursor + 1);
                break;
            case 'previous':
                this.props.moveSearchCursor(this.props.app, this.props.app.searchCursor - 1);
                break;
            case 'first':
                this.props.moveSearchCursor(this.props.app, 0);
                break;
            case 'last':
                this.props.moveSearchCursor(this.props.app, this.props.app.searchResults.length - 1);
                break;
            default:
                console.log("Invalid action");
                break;
        }
       
    }

    stopSearch(){
        this.props.stopSearch(this.props.app);
    }

    componentDidUpdate(prevProps){
        if(this.props.app.contentViewKey !== this.props.view){
            console.log("Not in view");
            return;
        }
        if(!this.props.app.filesToSearch){
            console.log("Search is not defined yet");
            return;
        }
        console.log("ComponentDidUpdate for logSearchSettings view " + this.props.view)
        if(this.props.app.nextFileToSearch !== prevProps.app.nextFileToSearch && 
                this.props.app.nextFileToSearch !== this.state.currentFileToSearch){
            let currentFileToSearchBeforeStateChange = this.state.currentFileToSearch;
            this.setState({currentFileToSearch: this.props.app.nextFileToSearch});
            const nextFileIndex = this.props.app.nextFileToSearch;
            if(nextFileIndex < this.props.app.filesToSearch.length){
                //dispatch
                console.log("Dispatch file Index: " + nextFileIndex + " currentFileToSearchBeforeStateChange : " + currentFileToSearchBeforeStateChange);
                this.props.searchInFile(this.props.app, nextFileIndex,  this.state.searchStrType);
            }else{
                console.log("Not dispatching searchInFile");
            }
        }else{
            console.log("Not dispatching searchInFile - No change in nextFileToSearch");
        }
    }

    componentDidMount(){
		
    }

    render(){
        console.log("Render on LogSearchSettings is invoked,,SearchCursor Value" + (this.props.app.searchCursor));
        const searchText = this.props.app.searchText  ? this.props.app.searchText :  '';
        
        let searchButtons = '';
        if(this.props.view === 'logs' && this.props.app.searchResults  && this.props.app.searchResults.length > 0){
            searchButtons  = ( <React.Fragment> 
            <InputGroup.Append>
                <Button variant="outline-warning" size="sm" onClick={() => this.moveSearchCursor('first')}>|◀</Button>
                <Button variant="outline-warning" size="sm" onClick={() => this.moveSearchCursor('previous')}>◀</Button>
                <Button variant="outline-warning" size="sm" onClick={() => this.moveSearchCursor('next')}>▶</Button>
                <Button variant="outline-warning" size="sm" onClick={() => this.moveSearchCursor('last')}>▶|</Button>
                <InputGroup.Text>{this.props.app.searchCursor + 1} (of {this.props.app.searchResults.length} matches) </InputGroup.Text>
            </InputGroup.Append>
            <div> </div>
            </React.Fragment>
            )
        }
        let searchInPrgoressContent = '';
        if(this.props.app.searchInProgress){ 
            searchInPrgoressContent  = (
                <div class={styles.searchInProgress}>
                    <div class={styles.loader}></div>
                    <div style={{paddingLeft: '5px'}}><Button variant="outline-warning" size="sm" onClick={() => this.stopSearch()}>X</Button></div>
                </div>
            )
        }
        let searchTypeButtonContent =  '';
        if (this.props.view === 'logs') {
            searchTypeButtonContent  = (<InputGroup.Prepend>
                <Button variant="outline-warning" onClick={() => this.togglesearchStrType()}>{this.state.searchStrType}</Button>
            </InputGroup.Prepend>)
        }
        let searchControl = '';
        if(this.props.view === 'logs'){
            searchControl  = (<FormControl ref="inputNode" aria-describedby="basic-addon1" value={searchText} onKeyUp={(event) => this.handleKeyPress(event)} onChange={(e) => this.searchTextChangeHandler(e)} autoFocus={true}/>)
        }
        if(this.props.view ===  'searchResults'){
            let searchingInFile = '';
            if(this.props.app.searchInProgress && this.props.app.filesToSearch){
                searchingInFile = (<Form.Label> -- In {this.props.app.filesToSearch[this.props.app.nextFileToSearch].Name} ( {this.props.app.nextFileToSearch +1} of {this.props.app.filesToSearch.length} files)</Form.Label>);
            }
            let searchMatches = '';
            if(this.props.app.searchResults  && this.props.app.searchResults.length > 0){
                searchMatches =  (<Form.Label> <b>Total Matches:</b> {this.props.app.searchResults.length}</Form.Label>);
            }
            console.log("App Content: "  + JSON.stringify(this.props.app));
            searchControl = (
                <div style={{paddingLeft: '1.0em', paddingTop:'2px'}}> <Form.Label><b>Search Text:</b> {searchText}</Form.Label> {searchingInFile} {searchMatches}</div>
            )
        }
        
        let searchIcon = '';
        if (this.props.view === 'logs') {
            searchIcon = (<div style={{padding: '2px 5px 0px 5px' , fontSize: '20px'}}>🔍</div>)
        }

        return (
            <React.Fragment>
                {searchIcon}
                <div>
                    <InputGroup size="sm">
                        {searchTypeButtonContent}
                        {searchControl}
                        {searchInPrgoressContent}
                        {searchButtons}
                       
                    </InputGroup>
                </div>
            </React.Fragment>
        );
    }
}

const mapStateToProps = state => {
	return {
   };
};

const mapDispatchToProps = dispatch => {
	return {
        setSearchText: (appId, searchText) =>  {dispatch({type: types.SET_SEARCH_TEXT, payload: {'id' : appId, 'searchText': searchText}})},
        search:  (app, searchStrType) => {dispatch(actions.search(app, searchStrType));},
        moveSearchCursor: (app, cursor) => {dispatch(actions.moveSearchCursor(app, cursor));},
        stopSearch: (app) => {dispatch({type: types.SEARCH_STOP, payload: {id: app.Id}})}, 
        searchInFile : (app, nextFileToSearch) => {dispatch(actions.searchInFile(app, nextFileToSearch))}  
	};
};


export default connect(mapStateToProps, mapDispatchToProps)(LogSearchSettings);