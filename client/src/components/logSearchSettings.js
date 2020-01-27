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
        this.props.setSearchText(this.props.monitoringLogSet.Id,  evt.target.value);
    }

    togglesearchStrType(){
        if(this.state.searchStrType === '.*'){
            this.setState({searchStrType:'TXT'});
        }else{
            this.setState({searchStrType:'.*'});
        }
    }

    search(){
        if(this.props.monitoringLogSet.searchText  && this.props.monitoringLogSet.searchText.length > 0){
            this.props.search(this.props.monitoringLogSet, this.state.searchStrType);
        }else{
            console.log("Search is not trigger for monitoringLogSet ", this.props.monitoringLogSet, "as searchText is null")
        }
    }


    moveSearchCursor(action){
        if(this.props.monitoringLogSet.searchCursor === undefined){
            this.props.moveSearchCursor(this.props.monitoringLogSet, 0);
            return;
        }
        switch(action){
            case 'next':
                this.props.moveSearchCursor(this.props.monitoringLogSet, this.props.monitoringLogSet.searchCursor + 1);
                break;
            case 'previous':
                this.props.moveSearchCursor(this.props.monitoringLogSet, this.props.monitoringLogSet.searchCursor - 1);
                break;
            case 'first':
                this.props.moveSearchCursor(this.props.monitoringLogSet, 0);
                break;
            case 'last':
                this.props.moveSearchCursor(this.props.monitoringLogSet, this.props.monitoringLogSet.searchResults.length - 1);
                break;
            default:
                console.log("Invalid action");
                break;
        }
       
    }

    stopSearch(){
        this.props.stopSearch(this.props.monitoringLogSet);
    }

    componentDidUpdate(prevProps){
        if(this.props.monitoringLogSet.contentViewKey !== this.props.view){
            return;
        }
        if(!this.props.monitoringLogSet.filesToSearch){
            return;
        }
        if(this.props.monitoringLogSet.nextFileToSearch !== prevProps.monitoringLogSet.nextFileToSearch && 
                this.props.monitoringLogSet.nextFileToSearch !== this.state.currentFileToSearch){
            let currentFileToSearchBeforeStateChange = this.state.currentFileToSearch;
            this.setState({currentFileToSearch: this.props.monitoringLogSet.nextFileToSearch});
            const nextFileIndex = this.props.monitoringLogSet.nextFileToSearch;
            if(nextFileIndex < this.props.monitoringLogSet.filesToSearch.length){
                //dispatch
                this.props.searchInFile(this.props.monitoringLogSet, nextFileIndex,  this.state.searchStrType);
            }else{
                console.log("Not dispatching searchInFile");
            }
        }
    }

    componentDidMount(){
		
    }

    render(){
        const searchText = this.props.monitoringLogSet.searchText  ? this.props.monitoringLogSet.searchText :  '';
        
        let searchInPrgoressContent = '';
        if(this.props.monitoringLogSet.searchInProgress){ 
            searchInPrgoressContent  = (
                <div class={styles.searchInProgress}>
                    <div class={styles.loader}></div>
                    <div style={{paddingLeft: '5px'}}><Button variant="outline-warning" size="sm" onClick={() => this.stopSearch()}>X</Button></div>
                </div>
            )
        }
        
        let searchButtons = '';
        let searchTypeButtonContent =  '';
        let searchControl = '';
        let searchIcon = '';
       
        if (this.props.view === 'logs') {
            if(this.props.monitoringLogSet.searchResults  && this.props.monitoringLogSet.searchResults.length > 0){
                searchButtons  = ( <React.Fragment> 
                <InputGroup.Append>
                    <Button variant="outline-warning" size="sm" onClick={() => this.moveSearchCursor('first')}>|◀</Button>
                    <Button variant="outline-warning" size="sm" onClick={() => this.moveSearchCursor('previous')}>◀</Button>
                    <Button variant="outline-warning" size="sm" onClick={() => this.moveSearchCursor('next')}>▶</Button>
                    <Button variant="outline-warning" size="sm" onClick={() => this.moveSearchCursor('last')}>▶|</Button>
                    <InputGroup.Text>{this.props.monitoringLogSet.searchCursor + 1} (of {this.props.monitoringLogSet.searchResults.length} matches) </InputGroup.Text>
                </InputGroup.Append>
                <div> </div>
                </React.Fragment>
                )
            }
            searchTypeButtonContent  = (<InputGroup.Prepend>
                <Button variant="outline-warning" onClick={() => this.togglesearchStrType()}>{this.state.searchStrType}</Button>
            </InputGroup.Prepend>)
            searchControl  = (<FormControl ref="inputNode" aria-describedby="basic-addon1" value={searchText} onKeyUp={(event) => this.handleKeyPress(event)} onChange={(e) => this.searchTextChangeHandler(e)} autoFocus={true}/>)
            searchIcon = (<div style={{padding: '2px 5px 0px 5px' , fontSize: '20px'}}>🔍</div>)

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
        else{
            let searchingInFile = '';
            if(this.props.monitoringLogSet.searchInProgress && this.props.monitoringLogSet.filesToSearch){
                searchingInFile = (<Form.Label> -- In {this.props.monitoringLogSet.filesToSearch[this.props.monitoringLogSet.nextFileToSearch].Name} ( {this.props.monitoringLogSet.nextFileToSearch +1} of {this.props.monitoringLogSet.filesToSearch.length} files)</Form.Label>);
            }
            let searchMatches = '';
            if(this.props.monitoringLogSet.searchResults  && this.props.monitoringLogSet.searchResults.length > 0){
                searchMatches =  (<Form.Label> <b>Total Matches:</b> {this.props.monitoringLogSet.searchResults.length}</Form.Label>);
            }
            return (
                <React.Fragment>
                    {searchIcon}
                    <div style={{paddingLeft: '1.0em', paddingTop:'2px'}}>
                        <InputGroup size="sm">
                        <Form.Label><b>Search Text:</b> {searchText}</Form.Label> {searchMatches}{searchInPrgoressContent} {searchingInFile}
                        </InputGroup>
                    </div>
                </React.Fragment>
            );
        }
    }
}

const mapStateToProps = state => {
	return {
   };
};

const mapDispatchToProps = dispatch => {
	return {
        setSearchText: (logsetId, searchText) =>  {dispatch({type: types.SET_SEARCH_TEXT, payload: {'id' : logsetId, 'searchText': searchText}})},
        search:  (monitoringLogSet, searchStrType) => {dispatch(actions.search(monitoringLogSet, searchStrType));},
        moveSearchCursor: (monitoringLogSet, cursor) => {dispatch(actions.moveSearchCursor(monitoringLogSet, cursor));},
        stopSearch: (monitoringLogSet) => {dispatch({type: types.SEARCH_STOP, payload: {id: monitoringLogSet.Id}})}, 
        searchInFile : (monitoringLogSet, nextFileToSearch) => {dispatch(actions.searchInFile(monitoringLogSet, nextFileToSearch))}  
	};
};


export default connect(mapStateToProps, mapDispatchToProps)(LogSearchSettings);